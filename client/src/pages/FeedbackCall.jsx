import { useState } from 'react';

const FeedbackCall = () => {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleCall = (e) => {
    e.preventDefault();
    console.log('Initiating call for:', name, phoneNumber);
    // Add call logic here
  };

  return (
    <div className="p-6 max-w-md mx-auto mt-10 bg-white rounded-xl shadow-md border border-gray-100">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800 text-center">Feedback Call</h2>
      <form onSubmit={handleCall} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            minLength={2}
            pattern="[A-Za-z ]*"
            onChange={(e) => {
              const val = e.target.value.replace(/[^A-Za-z ]/g, '');
              setName(val);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            placeholder="Enter name"
            required
          />
        </div>
        
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            minLength={10}
            maxLength={15}
            pattern='[0-9]{10}'
            value={phoneNumber}
            onInvalid={(e) => e.target.setCustomValidity('Please provide correct phone number')}
            onInput={(e) => e.target.setCustomValidity('')}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            placeholder="Enter phone number"
            required
          />
        </div>

        <button
          type="submit"
          disabled={!name || !phoneNumber}
          className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
        >
          Call
        </button>
      </form>
    </div>
  );
};

export default FeedbackCall;
