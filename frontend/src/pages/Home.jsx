import React, { useContext, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AuthContext from "@/providers/auth-context";
import { Container, Shield, Server } from "lucide-react";

function Home() {
    const { user } = useContext(AuthContext);
    const [floatingContainers, setFloatingContainers] = useState([]);
    
    useEffect(() => {
        const containers = [];
        for (let i = 0; i < 8; i++) {
            containers.push({
                id: i,
                x: Math.random() * 80 + 10,
                y: Math.random() * 80 + 10,
                size: Math.random() * 20 + 20,
                color: ['blue', 'green', 'purple', 'teal'][Math.floor(Math.random() * 4)],
                speed: Math.random() * 2 + 1,
                direction: Math.random() > 0.5 ? 1 : -1
            });
        }
        setFloatingContainers(containers);
        
        const interval = setInterval(() => {
            setFloatingContainers(prev => prev.map(container => ({
                ...container,
                y: container.y + (container.speed * container.direction * 0.1),
                direction: container.y <= 10 || container.y >= 90 ? -container.direction : container.direction
            })));
        }, 50);
        
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative min-h-full-w-nav overflow-hidden bg-gradient-to-b from-gray-900 to-black text-white">
            {floatingContainers.map(container => (
                <div 
                    key={container.id}
                    className={`absolute rounded opacity-30 bg-${container.color}-500 transition-all duration-500 ease-in-out flex items-center justify-center`}
                    style={{
                        left: `${container.x}%`,
                        top: `${container.y}%`,
                        width: `${container.size}px`,
                        height: `${container.size}px`,
                        transform: `rotate(${container.id * 45}deg)`
                    }}
                >
                    <Container className="w-1/2 h-1/2 text-white" />
                </div>
            ))}
            
            <div className="relative z-10 flex flex-col items-center justify-center p-8 h-full-w-nav">
                <h1 className="text-4xl font-bold mb-4">DockerSensei</h1>
                <p className="text-lg text-gray-400 mb-8 text-center max-w-md">
                    Master your Docker containers with intelligent role-based access control
                </p>
                
                {user.isAuthenticated ? (
                    <Button asChild className="bg-blue-600 hover:bg-blue-700">
                        <Link to="/containers">Go to Containers</Link>
                    </Button>
                ) : (
                    <div className="flex gap-4">
                        <Button asChild className="bg-blue-600 hover:bg-blue-700">
                            <Link to="/login">Log In</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link to="/register">Register</Link>
                        </Button>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl">
                    <div className="bg-gray-800 bg-opacity-50 p-4 rounded border border-gray-700">
                        <Container className="h-8 w-8 mb-2 text-blue-400" />
                        <h3 className="font-medium">Container Management</h3>
                        <p className="text-sm text-gray-400">Start, stop, and monitor containers</p>
                    </div>
                    
                    <div className="bg-gray-800 bg-opacity-50 p-4 rounded border border-gray-700">
                        <Server className="h-8 w-8 mb-2 text-green-400" />
                        <h3 className="font-medium">Real-time Monitoring</h3>
                        <p className="text-sm text-gray-400">Live stats and container logs</p>
                    </div>
                    
                    <div className="bg-gray-800 bg-opacity-50 p-4 rounded border border-gray-700">
                        <Shield className="h-8 w-8 mb-2 text-purple-400" />
                        <h3 className="font-medium">Role-Based Access</h3>
                        <p className="text-sm text-gray-400">Granular permission control</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;
