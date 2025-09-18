import React from "react";
import { Link } from "react-router-dom";
import { FaPhoneAlt, FaMapMarkedAlt, FaComments } from "react-icons/fa";

export default function Home() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 px-4">
      <div className="bg-white/80 backdrop-blur-lg shadow-2xl rounded-2xl p-10 w-full max-w-3xl border border-gray-200 transition-all duration-300 hover:shadow-blue-200">

        {/* Title */}
        <h1 className="text-4xl font-extrabold text-blue-700 mb-3 text-center tracking-tight">
          🚨 Disaster Manager
        </h1>
        <p className="text-gray-600 text-center mb-10 text-base">
          Stay connected, safe, and informed during emergencies.
        </p>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          
          {/* Emergency Call */}
          <Link
            to="/emergency"
            className="flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 p-7 rounded-2xl shadow-lg transition-transform transform hover:scale-105 border border-red-200"
          >
            <FaPhoneAlt className="text-red-600 text-5xl mb-3 drop-shadow" />
            <h2 className="text-lg font-semibold text-red-700">Emergency</h2>
            <p className="text-xs text-gray-600 text-center mt-1">
              Contact rescue teams instantly.
            </p>
          </Link>

          {/* Offline Map */}
          <Link
            to="/map"
            className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 p-7 rounded-2xl shadow-lg transition-transform transform hover:scale-105 border border-blue-200"
          >
            <FaMapMarkedAlt className="text-blue-600 text-5xl mb-3 drop-shadow" />
            <h2 className="text-lg font-semibold text-blue-700">Offline Map</h2>
            <p className="text-xs text-gray-600 text-center mt-1">
              Locate shelters and safe zones.
            </p>
          </Link>

          {/* P2P Chat */}
          <Link
            to="/p2pchat"
            className="flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 p-7 rounded-2xl shadow-lg transition-transform transform hover:scale-105 border border-green-200"
          >
            <FaComments className="text-green-600 text-5xl mb-3 drop-shadow" />
            <h2 className="text-lg font-semibold text-green-700">P2P Chat</h2>
            <p className="text-xs text-gray-600 text-center mt-1">
              Communicate without the internet.
            </p>
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-gray-500 text-xs">
          ⚡ <span className="font-medium">Fast</span> • 🛡️{" "}
          <span className="font-medium">Secure</span> • 📡{" "}
          <span className="font-medium">Always Ready</span>
        </div>
      </div>
    </div>
  );
}
