About:
====================
Queries jake-spec logs from jenkins and counts failed tests.

Install:
====================
    git clone git@github.int.yammer.com/yammer/jake-spec-error-counter
    cd jake-spec-error-counter
    npm install
    npm link
    cd yamjs
    npm link jake-spec-error-counter

Standalone Usage:
====================
    node cmd --project myJenkinsProject --latest 50
    node cmd --project myJenkinsProject --from 1300 --to 1350

Jake usage from within a project:
====================
    jake spec:sauceErrorCounter["--latest 50"]
    jake spec:sauceErrorCounter["--from 1300 --to 1350"]
Note: ```project``` is set within the project itself, and needent be included as an argument