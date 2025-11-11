"""
Master worker script for orchestrating the news processing pipeline.
This script replaces the monolithic worker.py with a fault-tolerant,
queue-based system using RQ (Redis Queue).

Usage:
    python master_worker.py --mode [scrape|trends|all] --limit 10
"""

import argparse
import logging
import sys
import time
from datetime import datetime
from app import create_app
from app.tasks import queue_all_scraping_tasks, health_check_task

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('master_worker.log')
    ]
)

logger = logging.getLogger(__name__)

def run_health_check():
    """Run a health check to verify the system is working."""
    logger.info("Running health check...")
    
    app = create_app()
    with app.app_context():
        try:
            job = health_check_task.queue()
            logger.info(f"Health check queued (Job ID: {job.id})")
            
            # Wait for result (with timeout)
            result = job.get(timeout=30)
            logger.info(f"Health check result: {result}")
            
            if result['status'] == 'healthy':
                logger.info("✅ System is healthy")
                return True
            else:
                logger.error("❌ System health check failed")
                return False
                
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return False

def run_scraping_pipeline(limit=10):
    """Run the scraping pipeline for all news sources."""
    logger.info(f"Starting scraping pipeline (limit: {limit} articles per source)")
    
    app = create_app()
    with app.app_context():
        try:
            # Queue all scraping tasks
            job_ids = queue_all_scraping_tasks(limit)
            
            if not job_ids:
                logger.error("No scraping tasks were queued")
                return False
            
            logger.info(f"Queued {len(job_ids)} scraping tasks")
            
            # Monitor job progress
            logger.info("Monitoring scraping tasks...")
            completed_jobs = 0
            failed_jobs = 0
            
            for job_id in job_ids:
                try:
                    # Get job result (with timeout)
                    job = app.rq.get_job(job_id)
                    if job:
                        result = job.get(timeout=300)  # 5 minute timeout per job
                        
                        if result['status'] == 'completed':
                            completed_jobs += 1
                            logger.info(f"✅ {result['source']}: {result['articles_added']} articles added")
                        else:
                            failed_jobs += 1
                            logger.error(f"❌ {result['source']}: {result.get('errors', ['Unknown error'])}")
                    else:
                        logger.warning(f"Job {job_id} not found")
                        
                except Exception as e:
                    failed_jobs += 1
                    logger.error(f"Job {job_id} failed: {str(e)}")
            
            logger.info(f"Scraping pipeline completed: {completed_jobs} successful, {failed_jobs} failed")
            return completed_jobs > 0
            
        except Exception as e:
            logger.error(f"Scraping pipeline failed: {str(e)}")
            return False


def run_full_pipeline(limit=10):
    """Run the complete news processing pipeline."""
    logger.info("Starting full news processing pipeline...")
    
    start_time = datetime.now()
    
    # Step 1: Health check
    if not run_health_check():
        logger.error("Health check failed, aborting pipeline")
        return False
    
    # Step 2: Scraping
    scraping_success = run_scraping_pipeline(limit)
    
    # Note: Trend analysis runs independently via scheduler
    # The scheduler handles queue_trend_analysis_task on its own schedule
    # No need to manually chain these processes
    
    # Summary
    end_time = datetime.now()
    duration = end_time - start_time
    
    logger.info(f"Pipeline completed in {duration}")
    logger.info(f"Results: Scraping={'✅' if scraping_success else '❌'}")
    logger.info("Note: Trend analysis runs independently via scheduler")
    
    return scraping_success

def main():
    """Main entry point for the master worker."""
    parser = argparse.ArgumentParser(description='Master worker for news processing pipeline')
    parser.add_argument('--mode', choices=['scrape', 'all', 'health'], 
                       default='all', help='Processing mode')
    parser.add_argument('--limit', type=int, default=10, 
                       help='Maximum articles per source (for scraping mode)')
    parser.add_argument('--verbose', '-v', action='store_true', 
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    logger.info(f"Starting master worker in {args.mode} mode")
    logger.info(f"Configuration: limit={args.limit}, verbose={args.verbose}")
    
    try:
        if args.mode == 'health':
            success = run_health_check()
        elif args.mode == 'scrape':
            success = run_scraping_pipeline(args.limit)
        elif args.mode == 'all':
            success = run_full_pipeline(args.limit)
        else:
            logger.error(f"Unknown mode: {args.mode}")
            success = False
        
        if success:
            logger.info("Master worker completed successfully")
            sys.exit(0)
        else:
            logger.error("Master worker completed with errors")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("Master worker interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Master worker failed: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
