# DockerSensei

## Overview

DockerSensei is a robust platform designed to manage Docker containers with fine-grained access control. It leverages **Permit.io** for Role-Based Access Control (RBAC), ensuring secure and scalable permission management.

## Features

-   **Access Control**:

    -   Fine-grained RBAC for managing user permissions using Permit.io.
    -   Dynamic role assignments and permission checks.
    -   Audit logging for all user actions.

-   **Container Management**:

    -   Start, stop, restart, and remove containers.
    -   View container logs and real-time stats.
    -   Spawn new containers with configurable options (ports, volumes, environment variables).

-   **Admin Dashboard**:

    -   Manage users and their roles.
    -   View detailed audit logs of system activities.
    -   Real-time updates for user and container actions.

-   **Authentication**:
    -   Secure JWT-based authentication.
    -   User registration, login, and password management.

## Predefined Roles

The system includes the following predefined roles with specific permissions:

-   **Admin**:

    -   Full access to all features.
    -   Can assign roles to other users.
    -   Can start, stop, restart, view logs, execute commands, and list all containers.

-   **Developer**:

    -   Can start, stop, restart, execute commands, view logs, and list containers.
    -   Cannot assign roles or manage users.

-   **Tester**:

    -   Can view logs and list containers.
    -   Cannot start, stop, restart, or execute commands on containers.

-   **Viewer**:
    -   No permissions to perform any actions.

## Tech Stack

### Backend

-   **Node.js**: JavaScript runtime for building scalable server-side applications.
-   **Express.js**: Web framework for building RESTful APIs.
-   **Prisma**: ORM for database management and migrations.
-   **PostgreSQL**: Relational database for storing application data.
-   **Permit.io**: Access control and RBAC solution for managing permissions.
-   **Dockerode**: Library for managing Docker containers programmatically.

### Frontend

-   **React.js**: Library for building user interfaces.
-   **Vite**: Fast build tool for modern web applications.
-   **Shadcn/UI**: Prebuilt accessible components for React.
-   **Tailwind CSS**: Utility-first CSS framework for styling.

### DevOps

-   **Docker**: Containerization platform for deploying and managing services.
-   **Docker Compose**: Tool for defining and running multi-container applications.
-   **Bitnami PostgreSQL**: Preconfigured PostgreSQL image for database services.
-   **Bitnami Redis**: Preconfigured Redis image for caching and session management.

## Installation

### Prerequisites

-   Docker installed on your system.
-   Node.js and npm installed (for local development).
-   PostgreSQL database.

### Steps

#### Using Docker Compose

1. Clone the repository:

    ```bash
    git clone https://github.com/MananGandhi1810/dockersensei.git
    cd dockersensei
    ```

2. Set up the environment variables:

    - Copy `.env.example` to `.env` in both `backend` and `frontend` directories.
    - Fill in the required values, including Permit.io credentials.

3. Start the services using Docker Compose:

    ```bash
    docker-compose up -d
    ```

4. Access the application:
    - Frontend: `http://localhost:8000`
    - Backend API: `http://localhost:3000`

#### Local Development

1. Follow the steps above to set up the environment variables.

2. Install dependencies:

    ```bash
    cd backend
    npm install
    cd ../frontend
    npm install
    ```

3. Run the backend:

    ```bash
    cd backend
    npm run dev
    ```

4. Run the frontend:

    ```bash
    cd frontend
    npm run dev
    ```

5. Access the application at `http://localhost:3000`.

## Usage

### Admin Features

-   Assign roles to users (e.g., Admin, Developer, Tester, Viewer).
-   Monitor audit logs for all actions performed in the system.

### User Features

-   Manage Docker containers (start, stop, restart, remove).
-   View container logs and stats.

## Access Control with Permit.io

Permit.io is integrated to provide secure and scalable access control. Key highlights:

-   **Dynamic Role Assignments**: Assign roles to users dynamically based on their actions.
-   **Permission Checks**: Ensure users can only perform actions they are authorized for.
-   **Audit Logs**: Track all actions performed by users for accountability.

### Permit.io Configuration

1. Set up a Permit.io project.
2. Add roles and permissions in the Permit.io dashboard.
3. Sync users and roles dynamically using the backend.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Open a pull request.

## Acknowledgments

-   [Permit.io](https://permit.io) for providing a powerful access control solution.
-   [Dockerode](https://github.com/apocas/dockerode) for Docker container management.
-   [Prisma](https://www.prisma.io) for seamless database integration.
