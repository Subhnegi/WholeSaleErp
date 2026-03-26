pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'whole-sale-erp-server'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        NODE_IMAGE = 'node:18-alpine'
        // Database credentials are optional when using Docker Compose
        // POSTGRES_DB = credentials('postgres-db')
        // POSTGRES_USER = credentials('postgres-user')
        // POSTGRES_PASSWORD = credentials('postgres-password')
        JWT_SECRET = credentials('jwt-secret')
        DB_PASSWORD = credentials('db-password')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('server') {
                    script {
                        // Use Docker to run Node.js 18 for dependencies
                        sh """
                            docker run --rm \
                                -v \$(pwd):/app \
                                -w /app \
                                ${NODE_IMAGE} \
                                sh -c '
                                    echo "Node version: \$(node --version)"
                                    echo "NPM version: \$(npm --version)"
                                    
                                    # Clean install
                                    rm -rf node_modules
                                    npm cache clean --force
                                    npm ci
                                '
                        """
                    }
                }
            }
        }

        stage('Generate Prisma Client') {
            steps {
                dir('server') {
                    sh """
                        docker run --rm \
                            -v \$(pwd):/app \
                            -w /app \
                            ${NODE_IMAGE} \
                            npm run prisma:generate
                    """
                }
            }
        }

        stage('Lint and Type Check') {
            steps {
                dir('server') {
                    sh """
                        docker run --rm \
                            -v \$(pwd):/app \
                            -w /app \
                            ${NODE_IMAGE} \
                            npm run typecheck
                    """
                }
            }
        }

        stage('Run Tests') {
            steps {
                dir('server') {
                    // Add test commands when tests are implemented
                    sh 'echo "No tests implemented yet"'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                dir('server') {
                    sh """
                        docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} .
                        docker build -t ${DOCKER_IMAGE}:latest .
                    """
                }
            }
        }

        stage('Run Database Migrations') {
            steps {
                script {
                    echo '🗄️ Running database migrations...'
                    sh """
                        # Clean up any existing containers and network
                        docker stop postgres-migration || true
                        docker rm postgres-migration || true
                        docker network rm whole-sale-erp-network || true
                        
                        # Create fresh network
                        docker network create whole-sale-erp-network
                        
                        # Start PostgreSQL container (no port binding needed for internal network)
                        echo "🐘 Starting PostgreSQL container..."
                        docker run -d \\
                            --name postgres-migration \\
                            --network whole-sale-erp-network \\
                            -e POSTGRES_DB=whole_sale_erp_production \\
                            -e POSTGRES_USER=user \\
                            -e "POSTGRES_PASSWORD=\${DB_PASSWORD}" \\
                            postgres:15-alpine
                        
                        # Wait for PostgreSQL to be ready with timeout
                        echo "⏳ Waiting for PostgreSQL to be ready..."
                        timeout=60
                        while [ \$timeout -gt 0 ]; do
                            if docker exec postgres-migration pg_isready -U user -d whole_sale_erp_production; then
                                echo "✅ PostgreSQL is ready!"
                                break
                            fi
                            echo "Waiting... (\$timeout seconds remaining)"
                            sleep 2
                            timeout=\$((timeout-2))
                        done
                        
                        if [ \$timeout -le 0 ]; then
                            echo "❌ PostgreSQL failed to start within 60 seconds"
                            docker logs postgres-migration
                            exit 1
                        fi
                        
                        # Run migrations
                        echo "🔄 Running Prisma migrations..."
                        docker run --rm \\
                            --network whole-sale-erp-network \\
                            -e "DATABASE_URL=postgresql://user:\${DB_PASSWORD}@postgres-migration:5432/whole_sale_erp_production" \\
                            -v \$(pwd)/server:/app \\
                            -w /app \\
                            \${NODE_IMAGE} \\
                            sh -c '
                                echo "Installing dependencies..."
                                npm ci --silent
                                echo "  Generating Prisma client..."
                                npm run prisma:generate
                                echo "Running migrations..."
                                npx prisma migrate deploy --schema=./prisma/schema.prisma
                                
                                echo "Migrations completed successfully!"
                            '
                        
                        echo "✅ Database migrations completed"
                        
                        # Stop and remove the temporary PostgreSQL container
                        docker stop postgres-migration || true
                        docker rm postgres-migration || true
                        docker network rm whole-sale-erp-network || true
                    """
                }
            }
        }

        stage('Deploy to Production') {
            steps {
                script {
                    def corsOrigin = env.CORS_ORIGIN ?: '*'
                    sh """
                        chmod +x deploy.sh
                        JWT_SECRET=${JWT_SECRET} \\
                        DB_PASSWORD=${DB_PASSWORD} \\
                        CORS_ORIGIN=${corsOrigin} \\
                        ./deploy.sh production ${DOCKER_TAG}
                    """
                }
            }
        }
    }

    post {
        always {
            sh 'docker system prune -f'
        }
        success {
            echo 'Pipeline succeeded!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}