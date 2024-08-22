import { DollarSign, CheckCircle, Video } from 'lucide-react';
import "../index.css";

const Pricing = (): JSX.Element => {
    return (
        <div className="h-screen bg-gray-900 text-gray-100">
            <header className="bg-gray-800/50 backdrop-blur-md border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center">
                    <Video className="h-8 w-8 text-cyan-400" />
                    <a href="/"><span className="ml-2 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">LiveLink</span></a>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 h-[calc(100vh-88px)] flex flex-col justify-center">
                <h1 className="text-4xl font-extrabold text-center mb-12 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                    Choose Your Plan
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {[
                        { 
                            title: "Starter", 
                            price: "Free", 
                            features: ["Holographic Video*", "1 Dimension Support", "Quantum Reach Lite*", "One to One"] 
                        },
                        { 
                            title: "Professional", 
                            price: "$19", 
                            features: ["Holographic Video*", "Multi-Dimensional Calls*", "Quantum Reach*", "One to One"] 
                        },
                        { 
                            title: "Enterprise", 
                            price: "$99", 
                            features: ["Under-Development","Holographic Video*", "Unlimited Dimensions*", "Quantum Encryption*", "Group Calls"] 
                        }
                    ].map((plan, index) => (
                        <div key={index} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700 hover:bg-gray-800 hover:border-cyan-400 transition-all duration-300">
                            <h2 className="text-2xl font-bold mb-4 text-cyan-400">{plan.title}</h2>
                            <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                                {plan.price}
                            </p>
                            <p className="mt-4 text-lg text-gray-400">per month</p>
                            <ul className="mt-6 space-y-4">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center">
                                        <CheckCircle className="h-5 w-5 text-cyan-400 mr-3" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button className="mt-8 w-full px-6 py-3 rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-gray-900 font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/50">
                                Select Plan
                            </button>
                        </div>
                    ))}
                </div>
            </main>

            <footer className="bg-gray-800 border-t border-gray-700">
                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-sm text-gray-400">
                        © 2024 LiveLink. *Some features are fictional and intended for demonstration purposes only.
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default Pricing;
