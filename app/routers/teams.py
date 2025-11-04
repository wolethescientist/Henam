from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy import desc
from typing import List, Optional
import logging
from app.database import get_db
from app.models import Team, User
from app.schemas import TeamCreate, TeamUpdate, TeamResponse, UserResponse
from app.auth import get_current_user
from app.utils.database_utils import DatabaseUtils, safe_get_by_id, safe_paginate
from app.exceptions import DatabaseError, ValidationError, ResourceNotFoundError, BusinessLogicError
from app.utils.error_handler import ErrorHandler, database_error_handler
from app.services.robust_cache_service import robust_cache
from app.services.cache_invalidation import cache_invalidation
from app.services.cache_middleware import cache_route

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/teams", tags=["teams"])


@router.post("/", response_model=TeamResponse)
def create_team(
    team_data: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new team (Admin only)."""
    try:
        # Validate supervisor exists if provided
        if team_data.supervisor_id:
            supervisor = safe_get_by_id(db, User, team_data.supervisor_id)
            if not supervisor:
                raise ValidationError(
                    detail="Invalid supervisor ID",
                    field="supervisor_id",
                    value=team_data.supervisor_id
                )
        
        db_team = Team(**team_data.dict())
        db.add(db_team)
        db.commit()
        db.refresh(db_team)
        
        # Reload with relationships
        team = db.query(Team).options(
            joinedload(Team.supervisor),
            joinedload(Team.members)
        ).filter(Team.id == db_team.id).first()
        
        logger.info(f"Team {db_team.id} created successfully by user {current_user.id}")
        
        # Invalidate related cache entries
        try:
            cache_invalidation.invalidate_team_data(db_team.id)
            # Also invalidate the teams list cache to ensure new team appears immediately
            cache_invalidation.invalidate_resource_pattern("team")
            cache_invalidation.invalidate_dashboard_data()  # Dashboard might show team counts
            logger.debug(f"Cache invalidated for team {db_team.id} and teams list")
        except Exception as e:
            logger.warning(f"Could not invalidate cache for team {db_team.id}: {e}")
        
        return team
        
    except ValidationError as e:
        raise e  # Re-raise structured errors
    except IntegrityError as e:
        logger.error(f"Integrity error creating team", exc_info=True)
        db.rollback()
        raise BusinessLogicError(
            detail="Team creation violates data constraints",
            rule="data_integrity",
            context={"team_name": team_data.name, "constraint_error": str(e)}
        )
    except SQLAlchemyError as e:
        logger.error(f"Database error creating team", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Failed to create team",
            operation="create_team",
            context={"team_name": team_data.name}
        )
    except Exception as e:
        logger.error(f"Unexpected error creating team: {e}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Team creation failed",
            operation="create_team",
            context={"team_name": team_data.name, "error_type": type(e).__name__}
        )


@router.get("/", response_model=List[TeamResponse])
@cache_route(resource_type="team", ttl=300)  # 5 minutes TTL
async def get_teams(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Get all teams (Admin only)."""
    offset = (page - 1) * limit
    teams = db.query(Team).options(
        joinedload(Team.supervisor),
        joinedload(Team.members)
    ).order_by(desc(Team.created_at)).offset(offset).limit(limit).all()
    
    return teams


@router.get("/{team_id}", response_model=TeamResponse)
@cache_route(resource_type="team", ttl=300)  # 5 minutes TTL
async def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Get team by ID (Admin only)."""
    try:
        team = db.query(Team).options(
            joinedload(Team.supervisor),
            joinedload(Team.members)
        ).filter(Team.id == team_id).first()
        
        if not team:
            raise ResourceNotFoundError(
                detail="Team not found",
                resource_type="Team",
                resource_id=team_id
            )
        
        logger.debug(f"Retrieved team {team_id}")
        return team
        
    except ResourceNotFoundError as e:
        raise e  # Re-raise structured errors
    except SQLAlchemyError as e:
        logger.error(f"Database error retrieving team {team_id}", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve team",
            operation="get_team",
            context={"team_id": team_id}
        )
    except Exception as e:
        logger.error(f"Unexpected error retrieving team {team_id}: {e}", exc_info=True)
        raise DatabaseError(
            detail="Team retrieval failed",
            operation="get_team",
            context={"team_id": team_id, "error_type": type(e).__name__}
        )


@router.put("/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: int,
    team_update: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update team (Admin only)."""
    try:
        team = safe_get_by_id(db, Team, team_id)
        if not team:
            raise ResourceNotFoundError(
                detail="Team not found",
                resource_type="Team",
                resource_id=team_id
            )
        
        # Validate supervisor exists if being updated
        if team_update.supervisor_id:
            supervisor = safe_get_by_id(db, User, team_update.supervisor_id)
            if not supervisor:
                raise ValidationError(
                    detail="Invalid supervisor ID",
                    field="supervisor_id",
                    value=team_update.supervisor_id
                )
        
        # Update team fields
        for field, value in team_update.dict(exclude_unset=True).items():
            setattr(team, field, value)
        
        db.commit()
        db.refresh(team)
        
        # Reload with relationships
        team = db.query(Team).options(
            joinedload(Team.supervisor),
            joinedload(Team.members)
        ).filter(Team.id == team_id).first()
        
        logger.info(f"Team {team_id} updated successfully by user {current_user.id}")
        
        # Invalidate related cache entries
        try:
            cache_invalidation.invalidate_team_data(team_id)
            # Also invalidate the teams list cache to ensure updates appear immediately
            cache_invalidation.invalidate_resource_pattern("team")
            cache_invalidation.invalidate_dashboard_data()  # Dashboard might show team data
            logger.debug(f"Cache invalidated for team {team_id} and teams list")
        except Exception as e:
            logger.warning(f"Could not invalidate cache for team {team_id}: {e}")
        
        return team
        
    except (ResourceNotFoundError, ValidationError) as e:
        raise e  # Re-raise structured errors
    except SQLAlchemyError as e:
        logger.error(f"Database error updating team {team_id}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Failed to update team",
            operation="update_team",
            context={"team_id": team_id}
        )
    except Exception as e:
        logger.error(f"Unexpected error updating team {team_id}: {e}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Team update failed",
            operation="update_team",
            context={"team_id": team_id, "error_type": type(e).__name__}
        )


@router.delete("/{team_id}")
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete team (Admin only)."""
    try:
        team = safe_get_by_id(db, Team, team_id)
        if not team:
            raise ResourceNotFoundError(
                detail="Team not found",
                resource_type="Team",
                resource_id=team_id
            )
        
        # Check if team has members
        if team.members:
            raise BusinessLogicError(
                detail="Cannot delete team with members. Please reassign members first.",
                rule="team_has_members",
                context={"team_id": team_id, "member_count": len(team.members)}
            )
        
        db.delete(team)
        db.commit()
        
        logger.info(f"Team {team_id} deleted successfully by user {current_user.id}")
        
        # Invalidate related cache entries
        try:
            cache_invalidation.invalidate_team_data(team_id)
            # Also invalidate the teams list cache to ensure deletion appears immediately
            cache_invalidation.invalidate_resource_pattern("team")
            cache_invalidation.invalidate_dashboard_data()  # Dashboard might show team counts
            logger.debug(f"Cache invalidated for deleted team {team_id} and teams list")
        except Exception as e:
            logger.warning(f"Could not invalidate cache for deleted team {team_id}: {e}")
        
        return {"message": "Team deleted successfully"}
        
    except (ResourceNotFoundError, BusinessLogicError) as e:
        raise e  # Re-raise structured errors
    except SQLAlchemyError as e:
        logger.error(f"Database error deleting team {team_id}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Failed to delete team",
            operation="delete_team",
            context={"team_id": team_id}
        )
    except Exception as e:
        logger.error(f"Unexpected error deleting team {team_id}: {e}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Team deletion failed",
            operation="delete_team",
            context={"team_id": team_id, "error_type": type(e).__name__}
        )


@router.get("/{team_id}/members", response_model=List[UserResponse])
def get_team_members(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get team members."""
    try:
        team = safe_get_by_id(db, Team, team_id)
        if not team:
            raise ResourceNotFoundError(
                detail="Team not found",
                resource_type="Team",
                resource_id=team_id
            )
        
        logger.debug(f"Retrieved {len(team.members)} members for team {team_id}")
        return team.members
        
    except ResourceNotFoundError as e:
        raise e  # Re-raise structured errors
    except SQLAlchemyError as e:
        logger.error(f"Database error retrieving team members for team {team_id}", exc_info=True)
        raise DatabaseError(
            detail="Failed to retrieve team members",
            operation="get_team_members",
            context={"team_id": team_id}
        )
    except Exception as e:
        logger.error(f"Unexpected error retrieving team members for team {team_id}: {e}", exc_info=True)
        raise DatabaseError(
            detail="Team members retrieval failed",
            operation="get_team_members",
            context={"team_id": team_id, "error_type": type(e).__name__}
        )


@router.post("/{team_id}/members/{user_id}")
def add_team_member(
    team_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add member to team (Admin only)."""
    try:
        team = safe_get_by_id(db, Team, team_id)
        if not team:
            raise ResourceNotFoundError(
                detail="Team not found",
                resource_type="Team",
                resource_id=team_id
            )
        
        user = safe_get_by_id(db, User, user_id)
        if not user:
            raise ResourceNotFoundError(
                detail="User not found",
                resource_type="User",
                resource_id=user_id
            )
        
        # Check if user is already in a team
        if user.team_id is not None:
            raise BusinessLogicError(
                detail="User is already assigned to a team",
                rule="user_already_in_team",
                context={"user_id": user_id, "current_team_id": user.team_id, "target_team_id": team_id}
            )
        
        user.team_id = team_id
        db.commit()
        db.refresh(team)
        
        logger.info(f"User {user_id} added to team {team_id} by user {current_user.id}")
        
        # Invalidate related cache entries
        try:
            cache_invalidation.invalidate_team_data(team_id)
            cache_invalidation.invalidate_user_data(user_id)
        except Exception as e:
            logger.warning(f"Could not invalidate cache: {e}")
        
        return team
        
    except (ResourceNotFoundError, BusinessLogicError) as e:
        raise e  # Re-raise structured errors
    except SQLAlchemyError as e:
        logger.error(f"Database error adding user {user_id} to team {team_id}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Failed to add member to team",
            operation="add_team_member",
            context={"team_id": team_id, "user_id": user_id}
        )
    except Exception as e:
        logger.error(f"Unexpected error adding user {user_id} to team {team_id}: {e}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Add team member failed",
            operation="add_team_member",
            context={"team_id": team_id, "user_id": user_id, "error_type": type(e).__name__}
        )


@router.delete("/{team_id}/members/{user_id}")
def remove_team_member(
    team_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove member from team (Admin only)."""
    try:
        team = safe_get_by_id(db, Team, team_id)
        if not team:
            raise ResourceNotFoundError(
                detail="Team not found",
                resource_type="Team",
                resource_id=team_id
            )
        
        user = safe_get_by_id(db, User, user_id)
        if not user:
            raise ResourceNotFoundError(
                detail="User not found",
                resource_type="User",
                resource_id=user_id
            )
        
        if user.team_id != team_id:
            raise BusinessLogicError(
                detail="User is not a member of this team",
                rule="user_not_in_team",
                context={"user_id": user_id, "user_team_id": user.team_id, "target_team_id": team_id}
            )
        
        user.team_id = None
        db.commit()
        db.refresh(team)
        
        logger.info(f"User {user_id} removed from team {team_id} by user {current_user.id}")
        
        # Invalidate related cache entries
        try:
            cache_invalidation.invalidate_team_data(team_id)
            cache_invalidation.invalidate_user_data(user_id)
        except Exception as e:
            logger.warning(f"Could not invalidate cache: {e}")
        
        return team
        
    except (ResourceNotFoundError, BusinessLogicError) as e:
        raise e  # Re-raise structured errors
    except SQLAlchemyError as e:
        logger.error(f"Database error removing user {user_id} from team {team_id}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Failed to remove member from team",
            operation="remove_team_member",
            context={"team_id": team_id, "user_id": user_id}
        )
    except Exception as e:
        logger.error(f"Unexpected error removing user {user_id} from team {team_id}: {e}", exc_info=True)
        db.rollback()
        raise DatabaseError(
            detail="Remove team member failed",
            operation="remove_team_member",
            context={"team_id": team_id, "user_id": user_id, "error_type": type(e).__name__}
        )