"""
RQ Worker launcher for news processing tasks.
This script starts RQ workers to process queued tasks.

Usage:
    python run_workers.py [queue_name] [--workers N]
"""

import argparse
import logging
import sys
import os
from app import create_app, rq

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def start_workers(queue_name='default', num_workers=1):
    """Start RQ workers for the specified queue."""
    logger.info(f"Starting {num_workers} worker(s) for queue: {queue_name}")
    
    app = create_app()
    
    with app.app_context():
        try:
            # Import RQ Worker
            from rq import Worker
            
            # Create workers
            workers = []
            for i in range(num_workers):
                worker = Worker([queue_name], connection=rq.connection)
                workers.append(worker)
                logger.info(f"Created worker {i+1} for queue {queue_name}")
        
            # Start workers
            logger.info("Starting workers...")
            logger.info("Press Ctrl+C to stop workers")
            
            for worker in workers:
                worker.work(with_scheduler=True)
                
        except KeyboardInterrupt:
            logger.info("Workers interrupted by user")
        except Exception as e:
            logger.error(f"Failed to start workers: {str(e)}")
            sys.exit(1)

def start_all_workers():
    """Start workers for all queues."""
    logger.info("Starting workers for all queues")
    
    app = create_app()
    
    with app.app_context():
        try:
            from rq import Worker
            
            # Get all configured queues
            queues = app.config.get('RQ_QUEUES', ['default'])
            
            # Create workers for each queue
            workers = []
            for queue_name in queues:
                worker = Worker([queue_name], connection=rq.connection)
                workers.append(worker)
                logger.info(f"Created worker for queue: {queue_name}")
            
            # Start workers
            logger.info("Starting all workers...")
            logger.info("Press Ctrl+C to stop workers")
            
            for worker in workers:
                worker.work(with_scheduler=True)
                
        except KeyboardInterrupt:
            logger.info("Workers interrupted by user")
        except Exception as e:
            logger.error(f"Failed to start workers: {str(e)}")
            sys.exit(1)

def main():
    """Main entry point for the worker launcher."""
    parser = argparse.ArgumentParser(description='RQ Worker launcher')
    parser.add_argument('queue', nargs='?', default='default',
                       help='Queue name to process (default: default)')
    parser.add_argument('--workers', '-w', type=int, default=1,
                       help='Number of workers to start (default: 1)')
    parser.add_argument('--all', action='store_true',
                       help='Start workers for all queues')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    logger.info(f"RQ Worker Launcher - Queue: {args.queue}, Workers: {args.workers}")
    
    try:
        if args.all:
            start_all_workers()
        else:
            start_workers(args.queue, args.workers)
            
    except KeyboardInterrupt:
        logger.info("Worker launcher interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Worker launcher failed: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
