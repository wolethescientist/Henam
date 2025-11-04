#!/usr/bin/env python3
"""
Script to update existing teams with supervisor_id values
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Team, User, UserRole

def update_team_supervisors():
    """Update teams with supervisor_id based on existing supervisor assignments"""
    db = next(get_db())
    
    try:
        # Get all teams
        teams = db.query(Team).all()
        
        for team in teams:
            # Find the supervisor for this team
            supervisor = db.query(User).filter(
                User.team_id == team.id,
                User.role == UserRole.SUPERVISOR
            ).first()
            
            if supervisor:
                team.supervisor_id = supervisor.id
                print(f"Updated team '{team.name}' with supervisor '{supervisor.name}' (ID: {supervisor.id})")
            else:
                print(f"No supervisor found for team '{team.name}'")
        
        # Commit the changes
        db.commit()
        print("Successfully updated all teams with supervisor information")
        
    except Exception as e:
        print(f"Error updating teams: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_team_supervisors()
