from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User, Team, Attendance, Task, TaskStatus, PerformanceMetrics, EfficiencyScore
from app.schemas import (
    UserProfileResponse, StaffPerformanceResponse, TeamPerformanceResponse,
    PerformanceMetricsResponse, UserUpdate
)
from app.auth import get_current_user
from app.services.cache_service import cache_result
from datetime import datetime, date, timedelta
from sqlalchemy import func, and_, case

router = APIRouter(prefix="/staff", tags=["staff-profiles"])


@router.get("/profiles", response_model=List[StaffPerformanceResponse])
@cache_result(ttl_seconds=600)  # Cache for 10 minutes
def get_staff_profiles(
    team_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get staff profiles with performance metrics."""
    from sqlalchemy.orm import joinedload
    
    # Single-user system - show all users (no role restriction)
    query = db.query(User)
    if team_id:
        query = query.filter(User.team_id == team_id)
    
    # Eager load relationships to avoid N+1 queries
    staff_members = query.options(
        joinedload(User.team),
        joinedload(User.supervisor)
    ).all()
    
    if not staff_members:
        return []
    
    staff_ids = [staff.id for staff in staff_members]
    current_month_start = date.today().replace(day=1)
    current_month_end = (current_month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    
    # Get all attendance data in one query
    attendance_data = db.query(
        Attendance.staff_id,
        func.count(Attendance.id).label('total_days'),
        func.sum(
            case(
                (Attendance.status == AttendanceStatus.PRESENT, 1),
                else_=0
            )
        ).label('present_days')
    ).filter(
        Attendance.staff_id.in_(staff_ids),
        Attendance.date >= current_month_start,
        Attendance.date <= current_month_end
    ).group_by(Attendance.staff_id).all()
    
    # Get all task data in optimized queries
    task_stats = db.query(
        Task.assigned_to_id,
        func.count(Task.id).label('total_tasks'),
        func.sum(
            case(
                (Task.status == TaskStatus.COMPLETED, 1),
                else_=0
            )
        ).label('completed_tasks'),
        func.sum(
            case(
                (and_(Task.status == TaskStatus.COMPLETED, Task.updated_at <= Task.deadline), 1),
                else_=0
            )
        ).label('completed_on_time')
    ).filter(
        Task.assigned_to_id.in_(staff_ids)
    ).group_by(Task.assigned_to_id).all()
    
    # Get job contributions
    job_contributions = db.query(
        Task.assigned_to_id,
        func.count(func.distinct(Task.job_id)).label('jobs_contributed')
    ).filter(
        Task.assigned_to_id.in_(staff_ids)
    ).group_by(Task.assigned_to_id).all()
    
    # Get latest efficiency scores
    efficiency_scores = db.query(
        EfficiencyScore.user_id,
        EfficiencyScore.efficiency_score
    ).filter(
        EfficiencyScore.user_id.in_(staff_ids)
    ).distinct(EfficiencyScore.user_id).order_by(
        EfficiencyScore.user_id, 
        EfficiencyScore.calculated_at.desc()
    ).all()
    
    # Create lookup dictionaries
    attendance_lookup = {
        row.staff_id: {
            'total_days': row.total_days or 0,
            'present_days': row.present_days or 0
        } for row in attendance_data
    }
    
    task_lookup = {
        row.assigned_to_id: {
            'total_tasks': row.total_tasks or 0,
            'completed_tasks': row.completed_tasks or 0,
            'completed_on_time': row.completed_on_time or 0
        } for row in task_stats
    }
    
    job_lookup = {
        row.assigned_to_id: row.jobs_contributed or 0 
        for row in job_contributions
    }
    
    efficiency_lookup = {
        row.user_id: row.efficiency_score 
        for row in efficiency_scores
    }
    
    # Build result
    result = []
    for staff in staff_members:
        attendance_info = attendance_lookup.get(staff.id, {'total_days': 0, 'present_days': 0})
        task_info = task_lookup.get(staff.id, {'total_tasks': 0, 'completed_tasks': 0, 'completed_on_time': 0})
        
        attendance_percentage = (
            (attendance_info['present_days'] / attendance_info['total_days'] * 100) 
            if attendance_info['total_days'] > 0 else 0
        )
        
        result.append(StaffPerformanceResponse(
            user_id=staff.id,
            name=staff.name,
            team_name=staff.team.name if staff.team else None,
            supervisor_name=staff.supervisor.name if staff.supervisor else None,
            attendance_percentage=round(attendance_percentage, 2),
            jobs_contributed=job_lookup.get(staff.id, 0),
            efficiency_score=round(efficiency_lookup.get(staff.id, 0.0), 2),
            tasks_completed=task_info['completed_tasks'],
            tasks_completed_on_time=task_info['completed_on_time'],
            picture_url=staff.picture_url
        ))
    
    return result


@router.get("/profiles/{user_id}", response_model=UserProfileResponse)
def get_staff_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed profile for a specific staff member."""
    staff = db.query(User).filter(User.id == user_id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    # Single-user system - allow access
    # Calculate performance metrics
    current_month_start = date.today().replace(day=1)
    current_month_end = (current_month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    
    # Attendance metrics
    attendance_records = db.query(Attendance).filter(
        Attendance.staff_id == staff.id,
        Attendance.date >= current_month_start,
        Attendance.date <= current_month_end
    ).all()
    
    present_days = len([r for r in attendance_records if r.status.value == 'present'])
    total_working_days = len(attendance_records)
    attendance_percentage = (present_days / total_working_days * 100) if total_working_days > 0 else 0
    
    # Jobs contributed
    jobs_contributed = db.query(Task.job_id).filter(
        Task.assigned_to_id == staff.id
    ).distinct().count()
    
    # Latest efficiency score
    latest_efficiency = db.query(EfficiencyScore).filter(
        EfficiencyScore.user_id == staff.id
    ).order_by(EfficiencyScore.calculated_at.desc()).first()
    
    efficiency_score = latest_efficiency.efficiency_score if latest_efficiency else 0.0
    
    # Get performance metrics record
    performance_metrics = db.query(PerformanceMetrics).filter(
        PerformanceMetrics.user_id == staff.id,
        PerformanceMetrics.period_start <= current_month_start,
        PerformanceMetrics.period_end >= current_month_end
    ).first()
    
    return UserProfileResponse(
        id=staff.id,
        name=staff.name,
        email=staff.email,
        team_id=staff.team_id,
        supervisor_id=staff.supervisor_id,
        picture_url=staff.picture_url,
        contact_info=staff.contact_info,
        is_active=staff.is_active,
        created_at=staff.created_at,
        updated_at=staff.updated_at,
        supervisor=staff.supervisor,
        team=staff.team,
        performance_metrics=performance_metrics,
        efficiency_score=efficiency_score,
        attendance_percentage=round(attendance_percentage, 2),
        jobs_contributed=jobs_contributed
    )


@router.put("/profiles/{user_id}", response_model=UserProfileResponse)
def update_staff_profile(
    user_id: int,
    profile_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update staff profile information."""
    staff = db.query(User).filter(User.id == user_id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )
    
    # Single-user system - allow access
    # Update fields
    for field, value in profile_update.dict(exclude_unset=True).items():
        setattr(staff, field, value)
    
    db.commit()
    db.refresh(staff)
    
    # Clear all cache to ensure fresh data
    try:
        from app.services.redis_cache_service import redis_cache
        if redis_cache.redis_client:
            # Clear all cache entries to ensure fresh data
            cleared_count = redis_cache.clear_pattern("*")
            print(f"🧹 Cleared {cleared_count} cache entries after staff profile update")
    except Exception as e:
        print(f"Warning: Could not clear cache: {e}")
    
    return get_staff_profile(user_id, db, current_user)


@router.get("/teams/performance", response_model=List[TeamPerformanceResponse])
@cache_result(ttl_seconds=600)  # Cache for 10 minutes
def get_team_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get team performance metrics."""
    from sqlalchemy.orm import joinedload
    
    # Build query based on user role
    # Single-user system - show all teams
    teams = db.query(Team).all()
    
    if not teams:
        return []
    
    team_ids = [team.id for team in teams]
    current_month_start = date.today().replace(day=1)
    current_month_end = (current_month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    
    # Get all team members with their relationships
    team_members = db.query(User).filter(
        User.team_id.in_(team_ids)
    ).options(
        joinedload(User.team)
    ).all()
    
    # Get team attendance data in one query
    team_attendance = db.query(
        User.team_id,
        func.count(Attendance.id).label('total_days'),
        func.sum(
            case(
                (Attendance.status == AttendanceStatus.PRESENT, 1),
                else_=0
            )
        ).label('present_days')
    ).join(Attendance, User.id == Attendance.staff_id).filter(
        User.team_id.in_(team_ids),
        Attendance.date >= current_month_start,
        Attendance.date <= current_month_end
    ).group_by(User.team_id).all()
    
    # Get team efficiency scores
    team_efficiency = db.query(
        User.team_id,
        func.avg(EfficiencyScore.efficiency_score).label('avg_efficiency')
    ).join(EfficiencyScore, User.id == EfficiencyScore.user_id).filter(
        User.team_id.in_(team_ids)
    ).group_by(User.team_id).all()
    
    # Get team job statistics
    team_job_stats = db.query(
        User.team_id,
        func.count(func.distinct(Task.job_id)).label('total_jobs'),
        func.sum(
            case(
                (Job.progress == 100.0, 1),
                else_=0
            )
        ).label('completed_jobs'),
        func.sum(
            case(
                (and_(Job.progress > 0.0, Job.progress < 100.0), 1),
                else_=0
            )
        ).label('ongoing_jobs')
    ).join(Task, User.id == Task.assigned_to_id).join(Job, Task.job_id == Job.id).filter(
        User.team_id.in_(team_ids)
    ).group_by(User.team_id).all()
    
    # Get supervisors for teams
    supervisors = db.query(User).filter(
        User.team_id.in_(team_ids),
        User.supervisor_id.is_(None)  # Find team leaders
    ).all()
    
    # Create lookup dictionaries
    attendance_lookup = {
        row.team_id: {
            'total_days': row.total_days or 0,
            'present_days': row.present_days or 0
        } for row in team_attendance
    }
    
    efficiency_lookup = {
        row.team_id: row.avg_efficiency or 0.0 
        for row in team_efficiency
    }
    
    job_stats_lookup = {
        row.team_id: {
            'total_jobs': row.total_jobs or 0,
            'completed_jobs': row.completed_jobs or 0,
            'ongoing_jobs': row.ongoing_jobs or 0
        } for row in team_job_stats
    }
    
    supervisor_lookup = {
        supervisor.team_id: supervisor.name 
        for supervisor in supervisors
    }
    
    # Count team members
    member_counts = {}
    for member in team_members:
        member_counts[member.team_id] = member_counts.get(member.team_id, 0) + 1
    
    # Build result
    result = []
    for team in teams:
        attendance_info = attendance_lookup.get(team.id, {'total_days': 0, 'present_days': 0})
        job_stats = job_stats_lookup.get(team.id, {'total_jobs': 0, 'completed_jobs': 0, 'ongoing_jobs': 0})
        
        average_attendance = (
            (attendance_info['present_days'] / attendance_info['total_days'] * 100) 
            if attendance_info['total_days'] > 0 else 0
        )
        
        result.append(TeamPerformanceResponse(
            team_id=team.id,
            team_name=team.name,
            supervisor_name=supervisor_lookup.get(team.id),
            total_members=member_counts.get(team.id, 0),
            average_attendance=round(average_attendance, 2),
            average_efficiency=round(efficiency_lookup.get(team.id, 0.0), 2),
            total_jobs_handled=job_stats['total_jobs'],
            jobs_completed=job_stats['completed_jobs'],
            jobs_ongoing=job_stats['ongoing_jobs']
        ))
    
    return result


@router.post("/efficiency/calculate")
def calculate_efficiency_scores(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate efficiency scores for all staff members (Admin only)."""
    # Get all staff members
    staff_members = db.query(User).all()  # Single user system - all users
    
    current_date = date.today()
    period_start = current_date.replace(day=1)  # Start of current month
    period_end = (period_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)  # End of current month
    
    calculated_count = 0
    
    for staff in staff_members:
        # Calculate attendance percentage
        attendance_records = db.query(Attendance).filter(
            Attendance.staff_id == staff.id,
            Attendance.date >= period_start,
            Attendance.date <= period_end
        ).all()
        
        present_days = len([r for r in attendance_records if r.status.value == 'present'])
        total_working_days = len(attendance_records)
        attendance_percentage = (present_days / total_working_days * 100) if total_working_days > 0 else 0
        
        # Calculate task completion percentage
        total_tasks = db.query(Task).filter(
            Task.assigned_to_id == staff.id,
            Task.created_at >= period_start,
            Task.created_at <= period_end
        ).count()
        
        completed_tasks = db.query(Task).filter(
            Task.assigned_to_id == staff.id,
            Task.status == TaskStatus.COMPLETED,
            Task.created_at >= period_start,
            Task.created_at <= period_end
        ).count()
        
        completed_on_time = db.query(Task).filter(
            Task.assigned_to_id == staff.id,
            Task.status == TaskStatus.COMPLETED,
            Task.updated_at <= Task.deadline,
            Task.created_at >= period_start,
            Task.created_at <= period_end
        ).count()
        
        task_completion_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        # Calculate efficiency score: (Attendance % × Task Completion % within Deadline) ÷ 2
        efficiency_score = (attendance_percentage * task_completion_percentage) / 2
        
        # Create or update efficiency score record
        existing_score = db.query(EfficiencyScore).filter(
            EfficiencyScore.user_id == staff.id,
            EfficiencyScore.period_start == period_start,
            EfficiencyScore.period_end == period_end
        ).first()
        
        if existing_score:
            existing_score.attendance_percentage = attendance_percentage
            existing_score.task_completion_percentage = task_completion_percentage
            existing_score.tasks_completed_on_time = completed_on_time
            existing_score.total_tasks_assigned = total_tasks
            existing_score.efficiency_score = efficiency_score
        else:
            new_score = EfficiencyScore(
                user_id=staff.id,
                team_id=staff.team_id,
                attendance_percentage=attendance_percentage,
                task_completion_percentage=task_completion_percentage,
                tasks_completed_on_time=completed_on_time,
                total_tasks_assigned=total_tasks,
                efficiency_score=efficiency_score,
                period_start=period_start,
                period_end=period_end
            )
            db.add(new_score)
        
        calculated_count += 1
    
    db.commit()
    
    return {
        "message": f"Efficiency scores calculated for {calculated_count} staff members",
        "period_start": period_start,
        "period_end": period_end
    }
