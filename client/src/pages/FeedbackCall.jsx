import { useState } from 'react';

const FeedbackCall = () => {
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCall = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    console.log('Initiating call for:', name, phoneNumber);
    
    try {
      const response = await fetch(
        'https://strategicerp.centiloquy.com/runtime/webhook/5761138d-caf0-406c-a001-e3310811e533/webhookTrigger/1c4faed3-72ea-4e7c-8fcc-a021b556fd39',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            countryCode,
            phoneNumber,
          }),
        }
      );
      
      if (response.ok) {
        setMessageType('success');
        setMessage('✓ Call initiated successfully! We will contact you shortly.');
        console.log('Webhook call successful');
        setName('');
        setPhoneNumber('');
      } else {
        setMessageType('error');
        setMessage('✗ Failed to initiate call. Please try again.');
        console.error('Webhook call failed:', response.status);
      }
    } catch (error) {
      setMessageType('error');
      setMessage('✗ An error occurred. Please check your connection and try again.');
      console.error('Error calling webhook:', error);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setMessage('');
      }, 4000);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto mt-10 bg-white rounded-xl shadow-md border border-gray-100">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800 text-center">Feedback Call</h2>
      
      {message && (
        <div className={`p-4 mb-4 rounded-lg font-medium text-center ${
          messageType === 'success'
            ? 'bg-green-100 text-green-800 border border-green-300'
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {message}
        </div>
      )}
      
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
          <label htmlFor="country-code" className="block text-sm font-medium text-gray-700 mb-1">
            Country Code
          </label>
          <select
            id="country-code"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          >
            <option value="+1">🇺🇸 United States (+1)</option>
            <option value="+44">🇬🇧 United Kingdom (+44)</option>
            <option value="+91">🇮🇳 India (+91)</option>
            <option value="+86">🇨🇳 China (+86)</option>
            <option value="+81">🇯🇵 Japan (+81)</option>
            <option value="+33">🇫🇷 France (+33)</option>
            <option value="+49">🇩🇪 Germany (+49)</option>
            <option value="+39">🇮🇹 Italy (+39)</option>
            <option value="+34">🇪🇸 Spain (+34)</option>
            <option value="+61">🇦🇺 Australia (+61)</option>
            <option value="+1">🇨🇦 Canada (+1)</option>
            <option value="+55">🇧🇷 Brazil (+55)</option>
            <option value="+27">🇿🇦 South Africa (+27)</option>
            <option value="+971">🇦🇪 UAE (+971)</option>
            <option value="+65">🇸🇬 Singapore (+65)</option>
          </select>
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
          disabled={!name || !phoneNumber || loading}
          className="w-full cursor-pointer bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
        >
          {loading ? 'Calling...' : 'Call'}
        </button>
      </form>
    </div>
  );
};

export default FeedbackCall;
