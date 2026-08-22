import os
import sys
import webbrowser
import threading
import time
import io

def open_browser():
    time.sleep(2)
    webbrowser.open('http://127.0.0.1:8000')

def main():
    # When built with PyInstaller as a windowed app (console=False),
    # sys.stdout / sys.stderr are None. Django's runserver command writes
    # startup messages directly to stdout/stderr, which crashes with
    # "AttributeError: 'NoneType' object has no attribute 'write'".
    # Redirect them to a null sink so Django has something safe to write to.
    if sys.stdout is None:
        sys.stdout = io.StringIO()
    if sys.stderr is None:
        sys.stderr = io.StringIO()

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
    sys.argv = ['run.py', 'runserver', '127.0.0.1:8000', '--noreload']

    # Start browser in a background thread
    threading.Thread(target=open_browser, daemon=True).start()

    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()