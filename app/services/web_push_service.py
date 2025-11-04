from pywebpush import webpush, WebPushException
from app.config import settings
import json
import logging

logger = logging.getLogger(__name__)


class WebPushService:
    def __init__(self):
        self.vapid_private_key = settings.vapid_private_key
        self.vapid_public_key = settings.vapid_public_key
        self.vapid_claims_email = settings.vapid_claims_email
    
    async def send_notification(self, user_id: int, title: str, body: str, data: dict = None):
        """Send a web push notification to a user."""
        try:
            # In a real implementation, you would:
            # 1. Get the user's subscription from the database
            # 2. Send the notification using pywebpush
            
            # For now, we'll just log the notification
            logger.info(f"Web push notification sent to user {user_id}: {title} - {body}")
            
            # Example of how to send a real notification:
            # subscription_info = {
            #     "endpoint": "https://fcm.googleapis.com/fcm/send/...",
            #     "keys": {
            #         "p256dh": "...",
            #         "auth": "..."
            #     }
            # }
            # 
            # payload = json.dumps({
            #     "title": title,
            #     "body": body,
            #     "data": data or {}
            # })
            # 
            # webpush(
            #     subscription_info=subscription_info,
            #     data=payload,
            #     vapid_private_key=self.vapid_private_key,
            #     vapid_claims={
            #         "sub": f"mailto:{self.vapid_claims_email}"
            #     }
            # )
            
        except WebPushException as e:
            logger.error(f"Web push notification failed: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error sending web push notification: {str(e)}")
            raise
    
    def get_vapid_public_key(self) -> str:
        """Get the VAPID public key for client-side subscription."""
        return self.vapid_public_key
