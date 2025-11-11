"""
RQ Scheduler for periodic news processing tasks.
This script sets up scheduled jobs for automated news processing.

Usage:
    python scheduler.py start    # Start the scheduler
    python scheduler.py stop     # Stop the scheduler
    python scheduler.py status   # Check scheduler status
"""

import argparse
import logging
import sys
import time
from datetime import datetime, timedelta
from app import create_app
from app.tasks import queue_all_scraping_tasks, queue_trend_analysis_task
from rq_scheduler import Scheduler
from redis import Redis

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('scheduler.log')
    ]
)

logger = logging.getLogger(__name__)

def get_scheduler():
    """Get or create the RQ scheduler instance."""
    app = create_app()
    with app.app_context():
        redis_conn = Redis.from_url(app.config['RQ_REDIS_URL'])
        return Scheduler(connection=redis_conn)

def start_scheduler():
    """Start the scheduler with predefined jobs."""
    logger.info("Starting RQ Scheduler...")
    
    try:
        scheduler = get_scheduler()
        
        # Schedule scraping tasks every 30 minutes
        scheduler.schedule(
            scheduled_time=datetime.now() + timedelta(minutes=1),  # Start in 1 minute
            func=queue_all_scraping_tasks,
            args=[10],  # limit=10 articles per source
            interval=1800,  # 30 minutes * 60 seconds = 1800 seconds
            queue_name='scraping'
        )
        
        # Schedule trend analysis every hour
        scheduler.schedule(
            scheduled_time=datetime.now() + timedelta(minutes=5),  # Start in 5 minutes
            func=queue_trend_analysis_task,
            interval=3600,  # 1 hour * 60 minutes * 60 seconds = 3600 seconds
            queue_name='trends'
        )
        
        logger.info("Scheduler started successfully")
        logger.info("Scraping tasks scheduled every 30 minutes")
        logger.info("Trend analysis scheduled every hour")
        
        # Show scheduled jobs
        jobs = list(scheduler.get_jobs())
        logger.info(f"Scheduled jobs: {len(jobs)}")
        for job in jobs:
            logger.info(f"  - {job.id}: {job.func_name} (scheduled)")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to start scheduler: {str(e)}")
        return False

def stop_scheduler():
    """Stop the scheduler and clear all scheduled jobs."""
    logger.info("Stopping RQ Scheduler...")
    
    try:
        scheduler = get_scheduler()
        
        # Cancel all scheduled jobs
        jobs = list(scheduler.get_jobs())
        for job in jobs:
            scheduler.cancel(job)
        
        logger.info("Scheduler stopped successfully")
        logger.info("All scheduled jobs cleared")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to stop scheduler: {str(e)}")
        return False

def get_scheduler_status():
    """Get the current status of the scheduler."""
    logger.info("Checking scheduler status...")
    
    try:
        scheduler = get_scheduler()
        
        # Get scheduled jobs
        jobs = list(scheduler.get_jobs())
        
        logger.info(f"Scheduler Status: {'Active' if jobs else 'Inactive'}")
        logger.info(f"Scheduled jobs: {len(jobs)}")
        
        if jobs:
            logger.info("Scheduled jobs:")
            for job in jobs:
                logger.info(f"  - {job.id}: {job.func_name} (scheduled)")
        else:
            logger.info("No scheduled jobs found")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to get scheduler status: {str(e)}")
        return False

def run_scheduler_daemon():
    """Run the scheduler as a daemon process."""
    logger.info("Starting scheduler daemon...")
    
    try:
        scheduler = get_scheduler()
        
        # Start the scheduler daemon
        logger.info("Scheduler daemon is running. Press Ctrl+C to stop.")
        
        while True:
            try:
                # Process scheduled jobs
                scheduler.run()
                time.sleep(1)  # Small delay to prevent excessive CPU usage
            except KeyboardInterrupt:
                logger.info("Scheduler daemon interrupted by user")
                break
            except Exception as e:
                logger.error(f"Scheduler daemon error: {str(e)}")
                time.sleep(5)  # Wait before retrying
        
        logger.info("Scheduler daemon stopped")
        return True
        
    except Exception as e:
        logger.error(f"Failed to run scheduler daemon: {str(e)}")
        return False

def main():
    """Main entry point for the scheduler."""
    parser = argparse.ArgumentParser(description='RQ Scheduler for news processing')
    parser.add_argument('command', choices=['start', 'stop', 'status', 'daemon'],
                       help='Scheduler command')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    logger.info(f"RQ Scheduler - Command: {args.command}")
    
    try:
        if args.command == 'start':
            success = start_scheduler()
        elif args.command == 'stop':
            success = stop_scheduler()
        elif args.command == 'status':
            success = get_scheduler_status()
        elif args.command == 'daemon':
            success = run_scheduler_daemon()
        else:
            logger.error(f"Unknown command: {args.command}")
            success = False
        
        if success:
            logger.info("Scheduler command completed successfully")
            sys.exit(0)
        else:
            logger.error("Scheduler command completed with errors")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("Scheduler interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Scheduler failed: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
