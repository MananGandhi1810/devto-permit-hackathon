import { useState, useContext } from "react";
import { Button } from "@/components/ui/button.jsx";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { PasswordInput } from "@/components/ui/password-input.jsx";
import { Loader2 } from "lucide-react";
import AuthContext from "@/providers/auth-context.jsx";
import axios from "axios";
import { useToast } from "@/hooks/use-toast.js";
import { useNavigate, useSearchParams } from "react-router-dom";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { setUser } = useContext(AuthContext);
    const { toast } = useToast();
    const navigate = useNavigate();
    let [searchParams, setSearchParams] = useSearchParams();

    const login = async (email, password) => {
        setLoading(true);
        const res = await axios
            .post(
                `${process.env.SERVER_URL}/auth/login`,
                {
                    email,
                    password,
                },
                {
                    validateStatus: false,
                },
            )
            .then((res) => res.data);
        if (res.success) {
            setUser({
                id: res.data.user.id,
                name: res.data.user.name,
                email: res.data.user.email,
                token: res.data.token,
                points: res.data.user.points,
                isAuthenticated: true,
            });
            toast({
                title: "Success",
                description: res.message,
            });
            navigate(searchParams.get("next") || "/");
        } else {
            toast({
                title: "Couldn't log in",
                description: res.message,
            });
        }
        setLoading(false);
    };

    return (
        <div className="h-full-w-nav w-screen m-auto flex items-center justify-center">
            <Card className="w-[350px] shadow-2xl">
                <form>
                    <CardHeader>
                        <CardTitle>Login</CardTitle>
                        <CardDescription>
                            Log in to your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="grid w-full items-center gap-4">
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="name">Email</Label>
                                <Input
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Your email"
                                />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="name">Password</Label>
                                <PasswordInput
                                    id="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="Your password"
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end flex-col mt-2 pb-6">
                        {loading ? (
                            <Button className="w-full" disabled>
                                <Loader2 className="mr-2 h-4 w-full animate-spin" />
                                Logging in
                            </Button>
                        ) : (
                            <Button
                                onClick={(e) => {
                                    e.preventDefault();
                                    login(email, password);
                                }}
                                className="w-full"
                            >
                                Log In
                            </Button>
                        )}
                        <Button
                            variant="link"
                            className="m-0 p-0 mt-1.5"
                            onClick={() => {
                                navigate("/forgot-password");
                            }}
                        >
                            Forgot Password?
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

export default Login;
