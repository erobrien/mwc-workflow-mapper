@echo off
REM MWC Revenue-Integrity Monitor - daily snapshot wrapper (read-only)
set PYEXE=C:\Users\eric_\AppData\Local\Programs\Python\Python313\python.exe
set REPO=C:\Users\eric_\Webdev\mwc-workflow-mapper
set PYTHONIOENCODING=utf-8
cd /d "%REPO%"
echo [%date% %time%] running daily snapshot >> "%REPO%\monitor\reports\cron.log"
"%PYEXE%" "%REPO%\monitor\collect.py" >> "%REPO%\monitor\reports\cron.log" 2>&1
echo [%date% %time%] done (exit %errorlevel%) >> "%REPO%\monitor\reports\cron.log"
