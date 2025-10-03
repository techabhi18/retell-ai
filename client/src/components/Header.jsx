import React from "react";
import { Link } from "react-router-dom";

const Header = () => {
    return (
        <header className="flex justify-between items-center px-6 py-4 bg-white shadow-sm">
            <Link to="/">
                <h1 className="text-xl font-semibold text-gray-800">Call Dashboard</h1>
            </Link>
            <nav className="space-x-6">
                <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium">
                    Create Batch Call
                </Link>
                <Link to="/call-list" className="text-gray-700 hover:text-blue-600 font-medium">
                    Call List
                </Link>
                <Link to="/chat" className="text-gray-700 hover:text-blue-600 font-medium">
                    Chat
                </Link>
            </nav>
        </header>
    );
};

export default Header;
