"""
Background job scheduler for surge predictions
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.services.surge_service import SurgeService

scheduler = AsyncIOScheduler()


async def daily_surge_prediction():
    """Daily job to compute and store surge predictions"""
    print("Running daily surge prediction...")
    from app.core.database import AsyncSessionLocal
    from app.services.surge_service import SurgeService
    
    async with AsyncSessionLocal() as db:
        surge_service = SurgeService(db)
        await surge_service.compute_daily_predictions("Delhi")
    print("Daily surge prediction completed")


# Schedule daily surge prediction at 2 AM
scheduler.add_job(
    daily_surge_prediction,
    trigger=CronTrigger(hour=2, minute=0),
    id="daily_surge_prediction",
    name="Daily Surge Prediction",
    replace_existing=True,
)

