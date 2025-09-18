import React from "react";
import { FaShieldAlt, FaHandsHelping, FaUsers, FaInfoCircle } from "react-icons/fa";

export default function About() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-2xl border border-gray-200">
        
        {/* Title */}
        <h1 className="text-3xl font-extrabold text-blue-700 mb-3 text-center flex items-center justify-center gap-2">
          <FaInfoCircle className="text-blue-600 text-3xl" />
          About Disaster Manager
        </h1>
        <p className="text-gray-600 text-center mb-6">
          A powerful tool designed to help people **communicate, locate, and stay safe** during natural disasters.
        </p>

        {/* Key Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
          
          {/* Real-time Help */}
          <div className="flex flex-col items-center bg-blue-50 border border-blue-200 rounded-xl p-5 shadow hover:shadow-md transition">
            <FaHandsHelping className="text-blue-600 text-3xl mb-2" />
            <h3 className="text-lg font-semibold text-blue-700">Instant Help</h3>
            <p className="text-sm text-gray-600 text-center">
              Quickly connect with rescue teams and emergency services.
            </p>
          </div>

          {/* Peer-to-Peer Chat */}
          <div className="flex flex-col items-center bg-green-50 border border-green-200 rounded-xl p-5 shadow hover:shadow-md transition">
            <FaUsers className="text-green-600 text-3xl mb-2" />
            <h3 className="text-lg font-semibold text-green-700">P2P Communication</h3>
            <p className="text-sm text-gray-600 text-center">
              Communicate even when the internet is down using P2P chat.
            </p>
          </div>

          {/* Offline Map */}
          <div className="flex flex-col items-center bg-purple-50 border border-purple-200 rounded-xl p-5 shadow hover:shadow-md transition">
            <FaShieldAlt className="text-purple-600 text-3xl mb-2" />
            <h3 className="text-lg font-semibold text-purple-700">Offline Maps</h3>
            <p className="text-sm text-gray-600 text-center">
              Access nearby shelters and safe zones without internet.
            </p>
          </div>

          {/* Disaster Info */}
          <div className="flex flex-col items-center bg-yellow-50 border border-yellow-200 rounded-xl p-5 shadow hover:shadow-md transition">
            <FaInfoCircle className="text-yellow-600 text-3xl mb-2" />
            <h3 className="text-lg font-semibold text-yellow-700">Disaster Info</h3>
            <p className="text-sm text-gray-600 text-center">
              Stay informed with real-time updates and safety tips.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          🚨 Our mission: **Save lives, connect people, and provide safety** during disasters.
        </div>
      </div>
    </div>
  );
}
