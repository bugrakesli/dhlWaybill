import os
import sys
import webbrowser
import threading
import time

def open_browser():
    time.sleep(2)
    webbrowser.open('http://127.0.0.0:8000')

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    
    # Force the arguments to run the server
    sys.argv = ['run.py', 'runserver', '127.0.0.0:8000', '--noreload']
    
    # Start browser in a background thread
    threading.Thread(target=open_browser, daemon=True).start()
    
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
