import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { toast } from "sonner";

const Register = () => {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setIsLoading(true);

        try {
            const response = await api.post('/auth/register', {
                username,
                email,
                password
            });

            const { token, ...userData } = response.data.data;
            login(token, userData);

            toast.success("Account created successfully!");
            navigate('/');
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            {/* Background Image */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/ww.jpg')" }}
            />
            {/* Dark Overlay for readability */}
            <div className="absolute inset-0 z-0 bg-black/50 backdrop-blur-[2px]" />

            <div className="w-full max-w-md relative z-10 animate-fade-up">
                <Link
                    to="/"
                    className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to home
                </Link>

                <Card className="border-white/10 bg-zinc-900 border shadow-2xl">
                    <CardHeader className="text-center space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <User className="w-6 h-6 text-white" />
                        </div>
                        <CardTitle className="text-2xl font-bold font-heading text-white">Create Account</CardTitle>
                        <CardDescription className="text-base text-gray-400">
                            Join the future of digital assets
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-white">Username</Label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-purple-400 transition-colors" />
                                    <Input
                                        id="username"
                                        placeholder="Your username"
                                        type="text"
                                        className="pl-10 bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500/50"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-white">Email</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-purple-400 transition-colors" />
                                    <Input
                                        id="email"
                                        placeholder="name@example.com"
                                        type="email"
                                        className="pl-10 bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500/50"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-white">Password</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-purple-400 transition-colors" />
                                    <Input
                                        id="password"
                                        type="password"
                                        className="pl-10 bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500/50"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password" className="text-white">Confirm Password</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-purple-400 transition-colors" />
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        className="pl-10 bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus:border-purple-500/50"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0" disabled={isLoading}>
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Sign Up
                            </Button>
                        </form>

                        <div className="text-center text-sm">
                            <span className="text-gray-400">Already have an account? </span>
                            <Link to="/login" className="text-purple-400 hover:text-purple-300 hover:underline font-medium transition-colors">
                                Sign in
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Register;
