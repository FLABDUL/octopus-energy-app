import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Zap, Flame, TrendingDown, TrendingUp, Lightbulb, AlertCircle } from 'lucide-react';
import { defaultCredentials } from './config/credentials';

export default function EnergyInsightsDashboard() {
  const [credentials, setCredentials] = useState(defaultCredentials);
  
  const [energyData, setEnergyData] = useState(null);
  const [insights, setInsights] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('electric');

  const fetchEnergyData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const electricData = [];
      const gasData = [];
      
      // Fetch electricity data
      if (credentials.electricMpan && credentials.electricSerial) {
        const electricUrl = `https://api.octopus.energy/v1/electricity-meter-points/${credentials.electricMpan}/meters/${credentials.electricSerial}/consumption/`;
        const electricResponse = await fetch(electricUrl, {
          headers: {
            'Authorization': 'Basic ' + btoa(credentials.octopusApiKey + ':')
          }
        });
        
        if (!electricResponse.ok) {
          throw new Error('Failed to fetch electricity data. Check your MPAN and serial number.');
        }
        
        const electricJson = await electricResponse.json();
        electricData.push(...electricJson.results);
      }
      
      // Fetch gas data
      if (credentials.gasMprn && credentials.gasSerial) {
        const gasUrl = `https://api.octopus.energy/v1/gas-meter-points/${credentials.gasMprn}/meters/${credentials.gasSerial}/consumption/`;
        const gasResponse = await fetch(gasUrl, {
          headers: {
            'Authorization': 'Basic ' + btoa(credentials.octopusApiKey + ':')
          }
        });
        
        if (!gasResponse.ok) {
          throw new Error('Failed to fetch gas data. Check your MPRN and serial number.');
        }
        
        const gasJson = await gasResponse.json();
        gasData.push(...gasJson.results);
      }
      
      setEnergyData({
        electric: electricData,
        gas: gasData
      });
      
      // Generate AI insights if OpenAI key is provided
      if (credentials.openaiApiKey) {
        // await generateOpenAIInsights(electricData, gasData);
        await generateClaudeInsights(electricData, gasData);
      } else {
        setInsights('Add your OpenAI API key to get AI-powered insights about your energy usage!');
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateClaudeInsights = async (electricData, gasData) => {
  try {
    const electricSummary = electricData.length > 0 ? {
      totalKwh: electricData.reduce((sum, d) => sum + d.consumption, 0).toFixed(2),
      avgDaily: (electricData.reduce((sum, d) => sum + d.consumption, 0) / electricData.length).toFixed(2),
      maxUsage: Math.max(...electricData.map(d => d.consumption)).toFixed(2),
      minUsage: Math.min(...electricData.map(d => d.consumption)).toFixed(2)
    } : null;
    
    const gasSummary = gasData.length > 0 ? {
      totalKwh: gasData.reduce((sum, d) => sum + d.consumption, 0).toFixed(2),
      avgDaily: (gasData.reduce((sum, d) => sum + d.consumption, 0) / gasData.length).toFixed(2),
      maxUsage: Math.max(...gasData.map(d => d.consumption)).toFixed(2),
      minUsage: Math.min(...gasData.map(d => d.consumption)).toFixed(2)
    } : null;

    const prompt = `You are an energy efficiency expert analyzing smart meter data from Octopus Energy for a UK household.

${electricSummary ? `Electricity Usage:
- Total consumption: ${electricSummary.totalKwh} kWh over ${electricData.length} periods
- Average per period: ${electricSummary.avgDaily} kWh
- Peak usage: ${electricSummary.maxUsage} kWh
- Minimum usage: ${electricSummary.minUsage} kWh` : ''}

${gasSummary ? `Gas Usage:
- Total consumption: ${gasSummary.totalKwh} kWh over ${gasData.length} periods
- Average per period: ${gasSummary.avgDaily} kWh
- Peak usage: ${gasSummary.maxUsage} kWh
- Minimum usage: ${gasSummary.minUsage} kWh` : ''}

Provide personalized insights including:
1. Overall assessment of their energy usage patterns
2. Specific recommendations to reduce consumption
3. Potential cost savings opportunities
4. Comparison to typical UK household usage
5. Any concerning patterns or anomalies

Keep the tone friendly and actionable. Focus on practical tips.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': credentials.openaiApiKey, // We'll rename this field
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          { 
            role: 'user', 
            content: prompt 
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate insights. Check your Anthropic API key.');
    }

    const data = await response.json();
    const insightText = data.content[0].text;
    
    setInsights(insightText);
  } catch (err) {
    setInsights(`Unable to generate AI insights: ${err.message}\n\nMake sure you've added a valid Anthropic API key with available credits.`);
  }
};

  const generateOpenAIInsights = async (electricData, gasData) => {
    try {
      const electricSummary = electricData.length > 0 ? {
        totalKwh: electricData.reduce((sum, d) => sum + d.consumption, 0).toFixed(2),
        avgDaily: (electricData.reduce((sum, d) => sum + d.consumption, 0) / electricData.length).toFixed(2),
        maxUsage: Math.max(...electricData.map(d => d.consumption)).toFixed(2),
        minUsage: Math.min(...electricData.map(d => d.consumption)).toFixed(2)
      } : null;
      
      const gasSummary = gasData.length > 0 ? {
        totalKwh: gasData.reduce((sum, d) => sum + d.consumption, 0).toFixed(2),
        avgDaily: (gasData.reduce((sum, d) => sum + d.consumption, 0) / gasData.length).toFixed(2),
        maxUsage: Math.max(...gasData.map(d => d.consumption)).toFixed(2),
        minUsage: Math.min(...gasData.map(d => d.consumption)).toFixed(2)
      } : null;

      const prompt = `You are an energy efficiency expert analyzing smart meter data from Octopus Energy for a UK household.

${electricSummary ? `Electricity Usage:
- Total consumption: ${electricSummary.totalKwh} kWh over ${electricData.length} periods
- Average per period: ${electricSummary.avgDaily} kWh
- Peak usage: ${electricSummary.maxUsage} kWh
- Minimum usage: ${electricSummary.minUsage} kWh` : ''}

${gasSummary ? `Gas Usage:
- Total consumption: ${gasSummary.totalKwh} kWh over ${gasData.length} periods
- Average per period: ${gasSummary.avgDaily} kWh
- Peak usage: ${gasSummary.maxUsage} kWh
- Minimum usage: ${gasSummary.minUsage} kWh` : ''}

Provide personalized insights including:
1. Overall assessment of their energy usage patterns
2. Specific recommendations to reduce consumption
3. Potential cost savings opportunities
4. Comparison to typical UK household usage
5. Any concerning patterns or anomalies

Keep the tone friendly and actionable. Focus on practical tips.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { 
              role: 'system', 
              content: 'You are a helpful energy efficiency expert providing personalized insights to UK households.' 
            },
            { 
              role: 'user', 
              content: prompt 
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights. Check your OpenAI API key.');
      }

      const data = await response.json();
      const insightText = data.choices[0].message.content;
      
      setInsights(insightText);
    } catch (err) {
      setInsights(`Unable to generate AI insights: ${err.message}\n\nMake sure you've added a valid OpenAI API key with available credits.`);
    }
  };

  const processChartData = (data) => {
    if (!data || data.length === 0) return [];
    
    return data.slice(0, 30).reverse().map(item => ({
      date: new Date(item.interval_start).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      consumption: parseFloat(item.consumption.toFixed(2)),
      time: new Date(item.interval_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    }));
  };

  const calculateStats = (data) => {
    if (!data || data.length === 0) return null;
    
    const total = data.reduce((sum, d) => sum + d.consumption, 0);
    const avg = total / data.length;
    const max = Math.max(...data.map(d => d.consumption));
    const min = Math.min(...data.map(d => d.consumption));
    
    return {
      total: total.toFixed(2),
      avg: avg.toFixed(2),
      max: max.toFixed(2),
      min: min.toFixed(2)
    };
  };

  const currentData = energyData ? (activeTab === 'electric' ? energyData.electric : energyData.gas) : [];
  const stats = calculateStats(currentData);
  const chartData = processChartData(currentData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Zap className="text-yellow-500" size={40} />
            Smart Energy Insights
          </h1>
          {/* <p className="text-gray-600">Powered by Octopus Energy & OpenAI</p> */}
          <p className="text-gray-600">Powered by Octopus Energy & Claude AI</p>
        </header>

        {!energyData ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Connect Your Account</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Octopus Energy API Key
                </label>
                <input
                  type="text"
                  value={credentials.octopusApiKey}
                  onChange={(e) => setCredentials({...credentials, octopusApiKey: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="sk_live_..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Claude API Key (Optional - for AI insights)
                </label>
                <input
                  type="password"
                  value={credentials.openaiApiKey}
                  onChange={(e) => setCredentials({...credentials, openaiApiKey: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="sk-ant-..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  Get your API key at console.anthropic.com
                </p>
                {/* <label className="block text-sm font-medium text-gray-700 mb-2">
                  OpenAI API Key (Optional - for AI insights)
                </label>
                <input
                  type="password"
                  value={credentials.openaiApiKey}
                  onChange={(e) => setCredentials({...credentials, openaiApiKey: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="sk-proj-..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  Get your free API key at platform.openai.com/api-keys
                </p> */}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={credentials.accountNumber}
                    onChange={(e) => setCredentials({...credentials, accountNumber: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="A-12345678"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Zap size={20} className="text-yellow-500" />
                  Electricity Meter
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      MPAN
                    </label>
                    <input
                      type="text"
                      value={credentials.electricMpan}
                      onChange={(e) => setCredentials({...credentials, electricMpan: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1234567890123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      value={credentials.electricSerial}
                      onChange={(e) => setCredentials({...credentials, electricSerial: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="12A3456789"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Flame size={20} className="text-orange-500" />
                  Gas Meter (Optional)
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      MPRN
                    </label>
                    <input
                      type="text"
                      value={credentials.gasMprn}
                      onChange={(e) => setCredentials({...credentials, gasMprn: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      value={credentials.gasSerial}
                      onChange={(e) => setCredentials({...credentials, gasSerial: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="G4A1234567"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
                  <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={fetchEnergyData}
                disabled={loading || !credentials.octopusApiKey || (!credentials.electricMpan && !credentials.gasMprn)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Fetch My Energy Data'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setActiveTab('electric')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                  activeTab === 'electric'
                    ? 'bg-yellow-500 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Zap size={20} />
                Electricity
              </button>
              {energyData.gas.length > 0 && (
                <button
                  onClick={() => setActiveTab('gas')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                    activeTab === 'gas'
                      ? 'bg-orange-500 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Flame size={20} />
                  Gas
                </button>
              )}
            </div>

            {stats && (
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600 text-sm mb-1">Total Consumption</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                  <p className="text-gray-500 text-sm">kWh</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600 text-sm mb-1">Average</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.avg}</p>
                  <p className="text-gray-500 text-sm">kWh per period</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600 text-sm mb-1 flex items-center gap-1">
                    Peak Usage <TrendingUp size={16} className="text-red-500" />
                  </p>
                  <p className="text-3xl font-bold text-gray-800">{stats.max}</p>
                  <p className="text-gray-500 text-sm">kWh</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600 text-sm mb-1 flex items-center gap-1">
                    Minimum Usage <TrendingDown size={16} className="text-green-500" />
                  </p>
                  <p className="text-3xl font-bold text-gray-800">{stats.min}</p>
                  <p className="text-gray-500 text-sm">kWh</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Usage Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'kWh', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="consumption" 
                    stroke={activeTab === 'electric' ? '#eab308' : '#f97316'} 
                    strokeWidth={2}
                    name="Consumption (kWh)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {insights && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <Lightbulb className="text-yellow-500" size={24} />
                  AI-Powered Insights
                </h2>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                  {insights}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setEnergyData(null);
                setInsights('');
                setError('');
              }}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition"
            >
              Change Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}