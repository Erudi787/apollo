import asyncio
import logging
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models import MoodEntry

logger = logging.getLogger(__name__)

# Configurable generic TTL policy, safely defaulting to 365 Days to support the Heatmap UI
RETENTION_PERIOD_DAYS = 365
# Run the purge loop every 12 hours (43200 seconds)
PURGE_INTERVAL_SECONDS = 43200 

async def retention_cleanup_loop():
    """
    Infinite asynchronous background loop that deletes MoodEntry rows older than the retention policy limit.
    Runs immediately once upon startup, and then sleeps interval by interval sequentially keeping storage pristine.
    """
    logger.info("Initializing automated data retention cleanup policy...")
    
    while True:
        try:
            db = SessionLocal()
            cutoff_date = datetime.utcnow() - timedelta(days=RETENTION_PERIOD_DAYS)
            
            # Execute mass-deletion on strictly expired mood entries
            deleted_count = db.query(MoodEntry).filter(MoodEntry.timestamp < cutoff_date).delete(synchronize_session=False)
            db.commit()
            
            if deleted_count > 0:
                logger.info(f"[RETENTION POLICY] Purged {deleted_count} stale rows migrating beyond the {RETENTION_PERIOD_DAYS} day TTL.")
            else:
                logger.debug("Retention purge executed, no stale entries found.")
        except Exception as e:
            logger.error(f"[RETENTION POLICY] Cleanup sweeping failure: {str(e)}")
        finally:
            db.close()
            
        # Sleep until the next sweeping cycle (12 hours)
        await asyncio.sleep(PURGE_INTERVAL_SECONDS)
