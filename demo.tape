# VHS script (https://github.com/charmbracelet/vhs). Render with: vhs demo.tape
# The fake token is assembled in the shell so this file holds no complete secret.
Output demo.gif

Set Shell "bash"
Set FontSize 16
Set Width 1100
Set Height 650
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 40ms

Hide
Type "export PS1='$ ' && cd $(mktemp -d) && git init -q && git config user.email dev@example.org && git config user.name dev && clear"
Enter
Show

Type "# A small project with a leftover token"
Enter
Type "mkdir src && echo '# demo' > README.md && echo 'MIT' > LICENSE && printf 'node_modules/\n.env\n' > .gitignore"
Enter
Type "P1=ghp_; P2=TESTONLY0123456789abcdefghijklmnopqr"
Enter
Type 'printf "const token = \"%s%s\";\n" "$P1" "$P2" > src/deploy.js'
Enter
Type "git add -A && git commit -qm 'first commit'"
Enter
Sleep 1s
Hide
Type "clear"
Enter
Show

Type "npx leakproof"
Enter
Sleep 4s
Type "echo $?"
Enter
Sleep 2s

Type "# Read the token from the environment instead"
Enter
Type "echo 'const token = process.env.DEPLOY_TOKEN;' > src/deploy.js"
Enter
Type "git add -A && git commit -qm 'read the token from the environment'"
Enter
Sleep 1s
Hide
Type "clear"
Enter
Show

Type "npx leakproof"
Enter
Sleep 3s
Type "echo $?"
Enter
Sleep 2s

Type "# The old commit still holds it:"
Enter
Type "npx leakproof --history"
Enter
Sleep 5s
