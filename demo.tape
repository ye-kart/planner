Output demo.gif

Require npx

Set Shell "bash"
Set FontSize 16
Set Width 1400
Set Height 800
Set Framerate 30
Set TypingSpeed 50ms
Set Padding 0

# Launch the TUI without npm output noise
Hide
Type "clear && npx tsx src/index.ts tui --theme purple"
Enter
Sleep 5s
Show

# Screen 1: Dashboard
Sleep 1s
Screenshot screenshots/01-dashboard.png

# Screen 2: Areas
Type "2"
Sleep 2s
Screenshot screenshots/02-areas.png

# Screen 3: Goals
Type "3"
Sleep 2s
Screenshot screenshots/03-goals.png

# Screen 4: Tasks
Type "4"
Sleep 2s
Screenshot screenshots/04-tasks.png

# Screen 5: Habits
Type "5"
Sleep 2s
Screenshot screenshots/05-habits.png

# Quit
Type "q"
Sleep 1s
