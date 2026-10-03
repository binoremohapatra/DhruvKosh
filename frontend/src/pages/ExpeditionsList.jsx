import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Compass, Ship, Snowflake, Mountain, Waves } from 'lucide-react';
import * as api from '../api/expeditions';

const ExpeditionsList = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    expedition_code: '',
    region: 'antarctic',
    start_date: '',
    end_date: '',
    status: 'planned'
  });

  const { data: expeditions, isLoading } = useQuery({
    queryKey: ['expeditions'],
    queryFn: api.getExpeditions
  });

  const expList = Array.isArray(expeditions) ? expeditions : (expeditions?.items || []);

  const mutation = useMutation({
    mutationFn: api.createExpedition,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['expeditions']);
      setShowModal(false);
      navigate(`/expeditions/${data.id}`);
    },
    onError: (err) => {
      console.error(err);
      alert('Failed to create expedition');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-ncpor-bg text-ncpor-primary font-sans p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 animate-fade-up" style={{ animationDelay: '0ms' }}>
          <div>
            <h1 className="text-3xl font-display text-ncpor-primary mb-2 tracking-tight">Expeditions</h1>
            <p className="text-ncpor-secondary text-base">Explore polar research expeditions across the globe.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-ncpor-accent hover:bg-ncpor-accent/90 text-ncpor-bg px-4 py-2 rounded-lg shadow-premium font-semibold flex items-center space-x-2 transition-all duration-150 active:scale-[0.98]">
            <Plus className="h-5 w-5" />
            <span>New Expedition</span>
          </button>
        </div>

        <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium overflow-hidden animate-fade-up" style={{ animationDelay: '60ms' }}>
          <div className="p-4 border-b border-ncpor-divider bg-ncpor-elevated flex items-center">
            <div className="relative w-64">
              <Search className="h-5 w-5 absolute left-3 top-2.5 text-ncpor-muted" />
              <input type="text" placeholder="Search expeditions..." className="pl-10 pr-4 py-2 w-full bg-ncpor-bg border border-ncpor-divider text-ncpor-primary rounded-lg focus:outline-none focus:border-ncpor-accent focus:ring-2 focus:ring-ncpor-accent/15 transition-all duration-220" />
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ncpor-accent mx-auto"></div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-ncpor-elevated text-ncpor-secondary text-xs border-b border-ncpor-divider">
                  <th className="px-6 py-4 font-semibold text-ncpor-secondary text-xs uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 font-semibold text-ncpor-secondary text-xs uppercase tracking-wider">Code</th>
                  <th className="px-6 py-4 font-semibold text-ncpor-secondary text-xs uppercase tracking-wider">Region</th>
                  <th className="px-6 py-4 font-semibold text-ncpor-secondary text-xs uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-4 font-semibold text-ncpor-secondary text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ncpor-divider">
                {expList?.map((exp, index) => (
                  <tr key={exp.id} className="hover:bg-ncpor-elevated/50 transition-colors duration-220 animate-fade-up" style={{ animationDelay: 120 + index * 40 + 'ms' }}>
                    <td className="px-6 py-4">
                      <Link to={`/expeditions/${exp.id}`} className="font-semibold text-ncpor-accent hover:underline flex items-center gap-2 transition-colors">
                        <Compass className="w-4 h-4" />
                        {exp.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-ncpor-secondary font-mono text-sm">{exp.expedition_code}</td>
                    <td className="px-6 py-4 text-ncpor-secondary capitalize flex items-center gap-2">
                      {exp.region === 'antarctic' && <Ship className="w-4 h-4 text-blue-400" />}
                      {exp.region === 'arctic' && <Snowflake className="w-4 h-4 text-cyan-400" />}
                      {exp.region === 'himalaya' && <Mountain className="w-4 h-4 text-purple-400" />}
                      {exp.region === 'southern_ocean' && <Waves className="w-4 h-4 text-teal-400" />}
                      {exp.region.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 text-ncpor-secondary text-sm">
                      {exp.start_date} {exp.end_date ? `to ${exp.end_date}` : ''}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${exp.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                          exp.status === 'ongoing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                            'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                      }`}>
                        {exp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium max-w-md w-full p-6 animate-scale-in">
              <h2 className="text-xl font-display text-ncpor-primary mb-4 tracking-tight">Create New Expedition</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ncpor-secondary mb-1">Name</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-ncpor-bg border border-ncpor-divider text-ncpor-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-ncpor-accent focus:ring-2 focus:ring-ncpor-accent/15 transition-all duration-220" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ncpor-secondary mb-1">Expedition Code</label>
                  <input required type="text" name="expedition_code" value={formData.expedition_code} onChange={handleChange} className="w-full bg-ncpor-bg border border-ncpor-divider text-ncpor-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-ncpor-accent focus:ring-2 focus:ring-ncpor-accent/15 transition-all duration-220" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ncpor-secondary mb-1">Region</label>
                  <select name="region" value={formData.region} onChange={handleChange} className="w-full bg-ncpor-bg border border-ncpor-divider text-ncpor-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-ncpor-accent focus:ring-2 focus:ring-ncpor-accent/15 transition-all duration-220">
                    <option value="antarctic">Antarctic</option>
                    <option value="arctic">Arctic</option>
                    <option value="himalaya">Himalaya</option>
                    <option value="southern_ocean">Southern Ocean</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ncpor-secondary mb-1">Start Date</label>
                    <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full bg-ncpor-bg border border-ncpor-divider text-ncpor-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-ncpor-accent focus:ring-2 focus:ring-ncpor-accent/15 transition-all duration-220" style={{colorScheme: 'dark'}} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ncpor-secondary mb-1">End Date</label>
                    <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="w-full bg-ncpor-bg border border-ncpor-divider text-ncpor-primary rounded-lg px-4 py-2.5 focus:outline-none focus:border-ncpor-accent focus:ring-2 focus:ring-ncpor-accent/15 transition-all duration-220" style={{colorScheme: 'dark'}} />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-ncpor-secondary hover:bg-ncpor-elevated rounded-lg font-medium transition-colors duration-220">Cancel</button>
                  <button type="submit" disabled={mutation.isPending} className="px-6 py-2 bg-ncpor-accent text-ncpor-bg hover:bg-ncpor-accent/90 rounded-lg shadow-premium font-semibold transition-all duration-150 active:scale-[0.98]">
                    {mutation.isPending ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpeditionsList;
