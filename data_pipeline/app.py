import os
from flask import Flask
from apscheduler.schedulers.background import BackgroundScheduler
from pipeline import process_and_store

app = Flask(__name__)

# Initialize the scheduler
scheduler = BackgroundScheduler()

# Add the scraper job to run every 1 minute
scheduler.add_job(func=process_and_store, trigger="interval", minutes=1)

# Start the scheduler
scheduler.start()

@app.route('/')
def index():
    return "FinTrack Data Pipeline is running. Scraper executes every 5 minutes in the background."

if __name__ == '__main__':
    # When running locally, start the Flask dev server.
    # On Render, Gunicorn will serve the app.
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
