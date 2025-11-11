# Dataset Builder for News Monitoring Desk

## Overview

The Dataset Builder is a powerful tool that generates realistic sample data for your News Monitoring Desk project. It creates comprehensive datasets with users, articles, trends, and sentiment analysis data that closely mimic real-world news monitoring scenarios.

## Features

### 🎯 Generated Data Types

1. **Users** - Multiple user roles with realistic profiles
   - Admin users with full access
   - Editor users with content management rights
   - Regular users with standard access

2. **Articles** - Diverse news articles with:
   - Realistic titles and content
   - Multiple news sources (BBC, CNN, Reuters, etc.)
   - Various categories (Technology, Business, Politics, etc.)
   - Timestamp distribution over the last 30 days
   - Sentiment analysis (positive, negative, neutral)

3. **Trends** - Trending topics with:
   - Realistic keyword combinations
   - Score-based popularity rankings
   - Current technology and business topics

## Installation

The dataset builder requires the `Faker` library for generating realistic data:

```bash
pip install Faker==33.0.0
```

Or install all requirements:

```bash
pip install -r requirements.txt
```

## Usage

### Basic Commands

```bash
# Show help and available commands
python dataset_builder.py help

# Build dataset with default settings (10 users, 100 articles, 20 trends)
python dataset_builder.py build

# Build dataset with custom counts
python dataset_builder.py build 5 50 10

# Show current dataset statistics
python dataset_builder.py stats
```

### Command Parameters

- `build [users] [articles] [trends]` - Generate dataset with specified counts
- `stats` - Display current dataset statistics
- `help` - Show help information

### Examples

```bash
# Small dataset for testing
python dataset_builder.py build 3 20 5

# Medium dataset for development
python dataset_builder.py build 10 100 20

# Large dataset for production testing
python dataset_builder.py build 25 500 50
```

## Generated Data Details

### Users
- **Admin User**: `admin` / `[SECURE RANDOM PASSWORD]` (admin@newsdesk.com)
- **Editor User**: `editor` / `[SECURE RANDOM PASSWORD]` (editor@newsdesk.com)
- **Regular Users**: Random usernames with secure random passwords

**⚠️ SECURITY NOTICE**: Passwords are now generated securely and displayed once during dataset creation. Save them immediately as they will not be shown again!

### Articles
- **Sources**: BBC News, CNN, Reuters, Associated Press, The Guardian, New York Times, Washington Post, Financial Times, Bloomberg, TechCrunch, Wired, Ars Technica, The Verge, Engadget, Forbes, Wall Street Journal, CNBC, MarketWatch
- **Categories**: Technology, Business, Politics, Health, Science, Sports, Entertainment, World News, Economy, Environment, Education, Crime, Weather, Travel, Food
- **Content**: Realistic article content with proper formatting and structure
- **Dates**: Random distribution over the last 30 days
- **Sentiment**: Automatically determined based on content keywords

### Trends
- **Keywords**: Current trending topics like AI, climate change, cryptocurrency, renewable energy, space exploration, cybersecurity, quantum computing, electric vehicles, etc.
- **Scores**: Realistic popularity scores between 0.1 and 0.95

## Data Quality Features

### Sentiment Analysis
The dataset builder includes intelligent sentiment analysis that:
- Analyzes article titles and content for sentiment indicators
- Assigns realistic sentiment scores
- Distributes sentiment across positive, negative, and neutral categories

### Realistic Content Generation
- Uses Faker library for realistic text generation
- Creates contextually appropriate content based on article categories
- Generates proper article structure with paragraphs and formatting

### Data Relationships
- Articles are properly linked to sources and categories
- Trends reflect current technology and business landscape
- User roles are properly assigned with appropriate permissions

## Database Integration

The dataset builder:
- Automatically clears existing data before generating new datasets
- Uses your existing Flask-SQLAlchemy models
- Maintains referential integrity
- Provides detailed statistics after generation

## Statistics Output

After building a dataset, you'll see comprehensive statistics including:
- User distribution by role
- Article distribution by source
- Sentiment analysis distribution
- Top trending topics
- Recent article counts

## Use Cases

### Development & Testing
- Generate test data for development environments
- Create consistent datasets for testing features
- Validate application functionality with realistic data

### Demonstrations
- Showcase your News Monitoring Desk with realistic data
- Demonstrate features with diverse content
- Present professional-looking datasets to stakeholders

### Performance Testing
- Generate large datasets for performance testing
- Test database queries with realistic data volumes
- Validate application scalability

## Customization

You can easily customize the dataset builder by modifying:

- **Sources**: Add or remove news sources in the `sources` list
- **Categories**: Modify the `categories` list for different article types
- **Trending Keywords**: Update `trending_keywords` for current topics
- **Content Templates**: Customize article content generation
- **Sentiment Logic**: Modify sentiment analysis algorithms

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all dependencies are installed
   ```bash
   pip install -r requirements.txt
   ```

2. **Database Errors**: Make sure your database is properly initialized
   ```bash
   python init_db.py
   ```

3. **Permission Errors**: Ensure the script has write access to the database

### Getting Help

- Run `python dataset_builder.py help` for usage information
- Check the console output for detailed error messages
- Verify your Flask application configuration

## Integration with Existing Tools

The dataset builder integrates seamlessly with your existing tools:

- **Database Manager**: Use `python db_manager.py stats` to view generated data
- **Flask Application**: Generated data appears immediately in your web interface
- **API Endpoints**: All generated data is accessible through your REST API

## Best Practices

1. **Backup First**: Always backup your database before generating new datasets
2. **Start Small**: Begin with small datasets and gradually increase size
3. **Test Regularly**: Generate test datasets to validate new features
4. **Monitor Performance**: Watch database performance with large datasets
5. **Version Control**: Keep track of dataset versions for consistency

## Contributing

To improve the dataset builder:

1. Add new content templates for different article types
2. Enhance sentiment analysis algorithms
3. Include more diverse news sources
4. Add geographic or language-specific content
5. Implement data export/import functionality

---

**Note**: This tool generates realistic sample data for development and testing purposes. Always ensure you have proper backups before running the dataset builder, as it will clear existing data.
