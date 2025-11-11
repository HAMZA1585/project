#!/usr/bin/env python3
"""
Data Dashboard for News Monitoring Desk
Web-based visualization of the generated datasets
"""

from flask import Flask, render_template_string, jsonify
from app import create_app, db
from app.models import User, Article, Trend
from sqlalchemy import func
from datetime import datetime, timedelta
import json

# Create Flask app
app = create_app()

# HTML Template for the dashboard
DASHBOARD_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>News Monitoring Desk - Data Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        .stat-label {
            color: #666;
            font-size: 1.1em;
        }
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .chart-container {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .chart-title {
            font-size: 1.3em;
            font-weight: bold;
            margin-bottom: 15px;
            color: #333;
        }
        .data-table {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .table-title {
            font-size: 1.3em;
            font-weight: bold;
            margin-bottom: 15px;
            color: #333;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .sentiment-positive { color: #28a745; }
        .sentiment-negative { color: #dc3545; }
        .sentiment-neutral { color: #6c757d; }
        .refresh-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1em;
            margin-bottom: 20px;
        }
        .refresh-btn:hover {
            background: #5a6fd8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 News Monitoring Desk - Data Dashboard</h1>
            <p>Real-time visualization of your generated datasets</p>
        </div>
        
        <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Data</button>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number" id="total-users">-</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="total-articles">-</div>
                <div class="stat-label">Total Articles</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="total-trends">-</div>
                <div class="stat-label">Trending Topics</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="recent-articles">-</div>
                <div class="stat-label">Recent Articles (7 days)</div>
            </div>
        </div>
        
        <div class="charts-grid">
            <div class="chart-container">
                <div class="chart-title">📰 Articles by Source</div>
                <canvas id="sourcesChart"></canvas>
            </div>
            <div class="chart-container">
                <div class="chart-title">😊 Sentiment Distribution</div>
                <canvas id="sentimentChart"></canvas>
            </div>
            <div class="chart-container">
                <div class="chart-title">📂 Articles by Category</div>
                <canvas id="categoriesChart"></canvas>
            </div>
            <div class="chart-container">
                <div class="chart-title">🔥 Top Trending Topics</div>
                <canvas id="trendsChart"></canvas>
            </div>
        </div>
        
        <div class="data-table">
            <div class="table-title">👥 Users Overview</div>
            <table id="usersTable">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                    </tr>
                </thead>
                <tbody id="usersTableBody">
                </tbody>
            </table>
        </div>
        
        <div class="data-table">
            <div class="table-title">📰 Recent Articles</div>
            <table id="articlesTable">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Source</th>
                        <th>Category</th>
                        <th>Date</th>
                        <th>Sentiment</th>
                    </tr>
                </thead>
                <tbody id="articlesTableBody">
                </tbody>
            </table>
        </div>
    </div>

    <script>
        // Load data from API endpoints
        async function loadData() {
            try {
                // Load statistics
                const statsResponse = await fetch('/api/dashboard/stats');
                const stats = await statsResponse.json();
                
                document.getElementById('total-users').textContent = stats.total_users;
                document.getElementById('total-articles').textContent = stats.total_articles;
                document.getElementById('total-trends').textContent = stats.total_trends;
                document.getElementById('recent-articles').textContent = stats.recent_articles;
                
                // Load charts data
                const chartsResponse = await fetch('/api/dashboard/charts');
                const chartsData = await chartsResponse.json();
                
                // Create charts
                createSourcesChart(chartsData.sources);
                createSentimentChart(chartsData.sentiments);
                createCategoriesChart(chartsData.categories);
                createTrendsChart(chartsData.trends);
                
                // Load tables data
                const tablesResponse = await fetch('/api/dashboard/tables');
                const tablesData = await tablesResponse.json();
                
                populateUsersTable(tablesData.users);
                populateArticlesTable(tablesData.articles);
                
            } catch (error) {
                console.error('Error loading data:', error);
            }
        }
        
        function createSourcesChart(data) {
            const ctx = document.getElementById('sourcesChart').getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: data.labels,
                    datasets: [{
                        data: data.values,
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
        
        function createSentimentChart(data) {
            const ctx = document.getElementById('sentimentChart').getContext('2d');
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: data.labels,
                    datasets: [{
                        data: data.values,
                        backgroundColor: ['#28a745', '#dc3545', '#6c757d']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
        
        function createCategoriesChart(data) {
            const ctx = document.getElementById('categoriesChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Articles',
                        data: data.values,
                        backgroundColor: '#667eea'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        function createTrendsChart(data) {
            const ctx = document.getElementById('trendsChart').getContext('2d');
            new Chart(ctx, {
                type: 'horizontalBar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Trend Score',
                        data: data.values,
                        backgroundColor: '#764ba2'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        function populateUsersTable(users) {
            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = '';
            
            users.forEach(user => {
                const row = tbody.insertRow();
                row.insertCell(0).textContent = user.id;
                row.insertCell(1).textContent = user.username;
                row.insertCell(2).textContent = user.email;
                row.insertCell(3).textContent = user.role;
            });
        }
        
        function populateArticlesTable(articles) {
            const tbody = document.getElementById('articlesTableBody');
            tbody.innerHTML = '';
            
            articles.forEach(article => {
                const row = tbody.insertRow();
                row.insertCell(0).textContent = article.title.substring(0, 50) + '...';
                row.insertCell(1).textContent = article.source;
                row.insertCell(2).textContent = article.category;
                row.insertCell(3).textContent = article.date;
                
                const sentimentCell = row.insertCell(4);
                sentimentCell.textContent = article.sentiment_label;
                sentimentCell.className = `sentiment-${article.sentiment_label}`;
            });
        }
        
        // Load data when page loads
        loadData();
    </script>
</body>
</html>
"""

@app.route('/dashboard')
def dashboard():
    """Serve the data dashboard"""
    return render_template_string(DASHBOARD_TEMPLATE)

@app.route('/api/dashboard/stats')
def api_stats():
    """API endpoint for dashboard statistics"""
    with app.app_context():
        stats = {
            'total_users': User.query.count(),
            'total_articles': Article.query.count(),
            'total_trends': Trend.query.count(),
            'recent_articles': Article.query.filter(
                Article.date >= datetime.now() - timedelta(days=7)
            ).count()
        }
        return jsonify(stats)

@app.route('/api/dashboard/charts')
def api_charts():
    """API endpoint for charts data"""
    with app.app_context():
        # Sources data
        sources = db.session.query(
            Article.source,
            func.count(Article.id).label('count')
        ).group_by(Article.source).order_by(func.count(Article.id).desc()).limit(10).all()
        
        # Sentiment data
        sentiments = db.session.query(
            Article.sentiment_label,
            func.count(Article.id).label('count')
        ).group_by(Article.sentiment_label).all()
        
        # Categories data
        categories = db.session.query(
            Article.category,
            func.count(Article.id).label('count')
        ).group_by(Article.category).order_by(func.count(Article.id).desc()).limit(10).all()
        
        # Trends data
        trends = Trend.query.order_by(Trend.score.desc()).limit(10).all()
        
        charts_data = {
            'sources': {
                'labels': [s[0] for s in sources],
                'values': [s[1] for s in sources]
            },
            'sentiments': {
                'labels': [s[0] for s in sentiments],
                'values': [s[1] for s in sentiments]
            },
            'categories': {
                'labels': [c[0] for c in categories],
                'values': [c[1] for c in categories]
            },
            'trends': {
                'labels': [t.keyword for t in trends],
                'values': [t.score for t in trends]
            }
        }
        
        return jsonify(charts_data)

@app.route('/api/dashboard/tables')
def api_tables():
    """API endpoint for tables data"""
    with app.app_context():
        users = User.query.all()
        articles = Article.query.order_by(Article.date.desc()).limit(20).all()
        
        tables_data = {
            'users': [
                {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role
                }
                for user in users
            ],
            'articles': [
                {
                    'title': article.title,
                    'source': article.source,
                    'category': article.category,
                    'date': article.date.strftime('%Y-%m-%d') if article.date else 'N/A',
                    'sentiment_label': article.sentiment_label
                }
                for article in articles
            ]
        }
        
        return jsonify(tables_data)

if __name__ == '__main__':
    print("🚀 Starting Data Dashboard...")
    print("📊 Dashboard available at: http://localhost:5000/dashboard")
    print("🔗 API endpoints:")
    print("   - /api/dashboard/stats")
    print("   - /api/dashboard/charts") 
    print("   - /api/dashboard/tables")
    app.run(debug=True, port=5000)
