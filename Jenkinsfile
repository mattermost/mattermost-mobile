pipeline {
    agent any

    stages {
        stage('Test') {
            steps {
                echo 'assets/base/config.json'
                sh 'cat assets/base/config.json'
                sh 'touch .podinstall'
                sh 'make test || exit 1'
            }
        }
    }
}