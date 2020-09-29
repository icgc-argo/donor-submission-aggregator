def dockerhubRepo = "icgcargo/donor-submission-aggregator"
def githubRepo = "icgc-argo/donor-submission-aggregator"
def commit = "UNKNOWN"
def version = "UNKNOWN"

pipeline {
    agent {
        kubernetes {
            label 'donor-submission-aggregator-executor'
            yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: node
    image: node:12.6.0
    tty: true
    env:
    - name: DOCKER_HOST
      value: tcp://localhost:2375
    - name: DEBUG
      value: testcontainers
  - name: docker
    image: docker:18-git
    tty: true
    volumeMounts:
    - mountPath: /var/run/docker.sock
      name: docker-sock
  - name: dind-daemon
    image: docker:18.06-dind
    securityContext:
      privileged: true
    volumeMounts:
    - name: docker-graph-storage
      mountPath: /var/lib/docker
  volumes:
  - name: docker-graph-storage
    emptyDir: {}
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
      type: File
"""
        }
    }
    options {
      timeout(time: 15, unit: 'MINUTES') 
    }
    stages {
      stage('Prepare') {
        steps {
          script {
            commit = sh(returnStdout: true, script: 'git describe --always').trim()
          }
          script {
            version = sh(returnStdout: true, script: 'cat package.json | grep version | cut -d \':\' -f2 | sed -e \'s/"//\' -e \'s/",//\'').trim()
          }
        }
      }

      stage('Test') {
        steps {
          container('node') {
            sh "npm ci"
            sh "npm run test"
          }
        }
      }

      stage('Build image') {
        steps {
          container('docker') {
            sh "docker build --network=host -t ${dockerhubRepo}:${commit} ."
          }
        }
      }

      stage('deploy to develop') {
        when {
          branch "develop"
        }
        steps {
          container('docker') {
            withCredentials([usernamePassword(credentialsId:'argoDockerHub', usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
                sh "docker login -u $USERNAME -p $PASSWORD"
            }
            sh "docker tag ${dockerhubRepo}:${commit} ${dockerhubRepo}:edge"
            sh "docker push ${dockerhubRepo}:${commit}"
            sh "docker push ${dockerhubRepo}:edge"
          }
          build(job: "/ARGO/provision/donor-submission-aggregator", parameters: [
            [$class: 'StringParameterValue', name: 'AP_ARGO_ENV', value: 'dev' ],
            [$class: 'StringParameterValue', name: 'AP_ARGS_LINE', value: "--set-string image.tag=${commit}" ]
          ])
        }
      }

      stage('deploy to QA') {
        when {
          branch "master"
        }
        steps {
          container('docker') {
            withCredentials([usernamePassword(credentialsId: 'argoGithub', passwordVariable: 'GIT_PASSWORD', usernameVariable: 'GIT_USERNAME')]) {
              sh "git tag ${version}"
              sh "git push https://${GIT_USERNAME}:${GIT_PASSWORD}@github.com/${githubRepo} --tags"
            }
            withCredentials([usernamePassword(credentialsId:'argoDockerHub', usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
                sh 'docker login -u $USERNAME -p $PASSWORD'
            }
            sh "docker tag ${dockerhubRepo}:${commit} ${dockerhubRepo}:${version}"
            sh "docker tag ${dockerhubRepo}:${commit} ${dockerhubRepo}:latest"
            sh "docker push ${dockerhubRepo}:${version}"
            sh "docker push ${dockerhubRepo}:latest"
          }
          build(job: "/ARGO/provision/donor-submission-aggregator", parameters: [
            [$class: 'StringParameterValue', name: 'AP_ARGO_ENV', value: 'qa' ],
            [$class: 'StringParameterValue', name: 'AP_ARGS_LINE', value: "--set-string image.tag=${version}" ]
          ])
        }
      }

    }

    post {
      unsuccessful {
        // i used node container since it has curl already
        container("node") {
          script {
            if (env.BRANCH_NAME == "master" || env.BRANCH_NAME == "develop") {
              withCredentials([string(credentialsId: 'JenkinsFailuresSlackChannelURL', variable: 'JenkinsFailuresSlackChannelURL')]) { 
                sh "curl -X POST -H 'Content-type: application/json' --data '{\"text\":\"Build Failed: ${env.JOB_NAME} [${env.BUILD_NUMBER}] (${env.BUILD_URL}) \"}' ${JenkinsFailuresSlackChannelURL}"
              }
            }
          }
        }
      }
      fixed {
        container("node") {
          script {
            if (env.BRANCH_NAME == "master" || env.BRANCH_NAME == "develop") {
              withCredentials([string(credentialsId: 'JenkinsFailuresSlackChannelURL', variable: 'JenkinsFailuresSlackChannelURL')]) { 
                sh "curl -X POST -H 'Content-type: application/json' --data '{\"text\":\"Build Fixed: ${env.JOB_NAME} [${env.BUILD_NUMBER}] (${env.BUILD_URL}) \"}' ${JenkinsFailuresSlackChannelURL}"
              }
            }
          }
        }
      }
    }
}
