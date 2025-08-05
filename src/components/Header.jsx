import React from "react";
import Link from "next/link";

const Header = () => {
    return (
        <header className="flex justify-between items-center px-6 py-4 bg-white shadow-sm">
            <h1 className="text-xl font-semibold text-gray-800">Call Dashboard</h1>
            <nav className="space-x-6">
                <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium">
                    Create Batch Call
                </Link>
                <Link href="/call-list" className="text-gray-700 hover:text-blue-600 font-medium">
                    Call List
                </Link>
            </nav>
        </header>
    );
};

export default Header;