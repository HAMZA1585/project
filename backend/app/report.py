from flask import Blueprint, jsonify, send_from_directory, request
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
import datetime
import os
from .models import Article

# Use a consistent Blueprint name
report_bp = Blueprint('report_bp', __name__)

# Ensure a directory exists for reports within the instance folder
REPORT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'instance', 'reports')
os.makedirs(REPORT_DIR, exist_ok=True)

@report_bp.route('/generate', methods=['POST'])
def generate_report_route():
    data = request.get_json()
    report_format = data.get('format', 'pdf').lower()

    # Fetch the 50 most recent articles from the database
    articles = Article.query.order_by(Article.date.desc()).limit(50).all()
    if not articles:
        return jsonify({"error": "No articles in the database to generate a report."}), 404

    articles_data = [
        {
            "Title": article.title,
            "Source": article.source,
            "Sentiment": article.sentiment_label,
            "Date": article.date.strftime('%Y-%m-%d') if article.date else 'N/A'
        } for article in articles
    ]

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"news_report_{timestamp}.{report_format}"
    filepath = os.path.join(REPORT_DIR, filename)
    
    try:
        if report_format == 'csv':
            df = pd.DataFrame(articles_data)
            df.to_csv(filepath, index=False)
        
        elif report_format == 'pdf':
            doc = SimpleDocTemplate(filepath, pagesize=letter)
            elements = []
            styles = getSampleStyleSheet()
            
            elements.append(Paragraph("News Monitoring Desk Report", styles['h1']))
            elements.append(Paragraph(f"Generated on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
            elements.append(Spacer(1, 24))
            
            table_data = [list(articles_data[0].keys())] + [list(d.values()) for d in articles_data]
            
            pdf_table = Table(table_data)
            pdf_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#4F46E5')), # Indigo header
                ('TEXTCOLOR',(0,0),(-1,0),colors.whitesmoke),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0,0), (-1,0), 12),
                ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F3F4F6')), # Gray rows
                ('GRID', (0,0), (-1,-1), 1, colors.black)
            ]))
            elements.append(pdf_table)
            doc.build(elements)
        else:
            return jsonify({"error": "Unsupported format specified"}), 400

        return jsonify({
            "message": f"{report_format.upper()} report generated successfully",
            "filename": filename
        })
    except Exception as e:
        return jsonify({"error": f"Failed to generate report: {str(e)}"}), 500

@report_bp.route('/download/<path:filename>')
def download_report(filename):
    try:
        return send_from_directory(REPORT_DIR, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "File not found."}), 404