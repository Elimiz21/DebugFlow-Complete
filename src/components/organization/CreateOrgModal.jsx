import React, { useState } from 'react';
import { X, Building2, Users, Globe, Lock, AlertCircle } from 'lucide-react';
import organizationService from '../../services/OrganizationService.js';
import toast from 'react-hot-toast';

const CreateOrgModal = ({ isOpen, onClose, onOrgCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    industry: '',
    size: '',
    plan: 'starter'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Manufacturing',
    'Retail',
    'Consulting',
    'Government',
    'Non-profit',
    'Other'
  ];

  const organizationSizes = [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-1000', label: '201-1000 employees' },
    { value: '1000+', label: '1000+ employees' }
  ];

  const plans = [
    {
      value: 'starter',
      label: 'Starter',
      description: 'Perfect for small teams getting started',
      features: ['Up to 5 members', 'Basic collaboration', 'Community support'],
      price: 'Free'
    },
    {
      value: 'professional',
      label: 'Professional',
      description: 'Advanced features for growing teams',
      features: ['Up to 50 members', 'Advanced analytics', 'Priority support', 'Custom integrations'],
      price: '$29/month'
    },
    {
      value: 'enterprise',
      label: 'Enterprise',
      description: 'Full-featured solution for large organizations',
      features: ['Unlimited members', 'Advanced security', 'SLA support', 'Custom deployment'],
      price: 'Contact Sales'
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Organization name must be at least 2 characters';
    }

    if (formData.website && !isValidUrl(formData.website)) {
      newErrors.website = 'Please enter a valid website URL';
    }

    if (!formData.industry) {
      newErrors.industry = 'Please select an industry';
    }

    if (!formData.size) {
      newErrors.size = 'Please select organization size';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string.startsWith('http') ? string : `https://${string}`);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const orgData = {
        ...formData,
        website: formData.website && !formData.website.startsWith('http') 
          ? `https://${formData.website}` 
          : formData.website
      };

      const result = await organizationService.createOrganization(orgData);
      
      toast.success('Organization created successfully!');
      onOrgCreated(result);
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        website: '',
        industry: '',
        size: '',
        plan: 'starter'
      });
      setErrors({});
    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error(error.message || 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <div className="flex items-center">
              <Building2 className="w-6 h-6 text-blue-400 mr-2" />
              <h3 className="text-lg font-medium text-white">
                Create Organization
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Basic Information */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-gray-200 mb-4 flex items-center">
                    <Building2 className="w-4 h-4 mr-2" />
                    Basic Information
                  </h4>
                  
                  {/* Organization Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Organization Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:ring-blue-500 focus:border-blue-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-600'
                      }`}
                      placeholder="Acme Corporation"
                      required
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-400 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Brief description of your organization..."
                    />
                  </div>

                  {/* Website */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Website
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-gray-600 bg-gray-600 text-gray-400 text-sm">
                        <Globe className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        className={`flex-1 px-3 py-2 bg-gray-700 border rounded-r-md text-white focus:ring-blue-500 focus:border-blue-500 ${
                          errors.website ? 'border-red-500' : 'border-gray-600'
                        }`}
                        placeholder="example.com"
                      />
                    </div>
                    {errors.website && (
                      <p className="mt-1 text-sm text-red-400 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.website}
                      </p>
                    )}
                  </div>
                </div>

                {/* Organization Details */}
                <div>
                  <h4 className="text-md font-medium text-gray-200 mb-4 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Organization Details
                  </h4>
                  
                  {/* Industry */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Industry <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="industry"
                      value={formData.industry}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:ring-blue-500 focus:border-blue-500 ${
                        errors.industry ? 'border-red-500' : 'border-gray-600'
                      }`}
                      required
                    >
                      <option value="">Select industry...</option>
                      {industries.map(industry => (
                        <option key={industry} value={industry.toLowerCase()}>
                          {industry}
                        </option>
                      ))}
                    </select>
                    {errors.industry && (
                      <p className="mt-1 text-sm text-red-400 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.industry}
                      </p>
                    )}
                  </div>

                  {/* Organization Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Organization Size <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="size"
                      value={formData.size}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:ring-blue-500 focus:border-blue-500 ${
                        errors.size ? 'border-red-500' : 'border-gray-600'
                      }`}
                      required
                    >
                      <option value="">Select size...</option>
                      {organizationSizes.map(size => (
                        <option key={size.value} value={size.value}>
                          {size.label}
                        </option>
                      ))}
                    </select>
                    {errors.size && (
                      <p className="mt-1 text-sm text-red-400 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.size}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Plan Selection */}
              <div>
                <h4 className="text-md font-medium text-gray-200 mb-4 flex items-center">
                  <Lock className="w-4 h-4 mr-2" />
                  Choose Plan
                </h4>
                
                <div className="space-y-4">
                  {plans.map(plan => (
                    <div
                      key={plan.value}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                        formData.plan === plan.value
                          ? 'border-blue-500 bg-blue-900 bg-opacity-20'
                          : 'border-gray-600 bg-gray-700'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, plan: plan.value }))}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="plan"
                            value={plan.value}
                            checked={formData.plan === plan.value}
                            onChange={handleInputChange}
                            className="text-blue-600 focus:ring-blue-500 mr-3"
                          />
                          <div>
                            <h5 className="font-medium text-white">{plan.label}</h5>
                            <p className="text-sm text-gray-400">{plan.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-blue-400">{plan.price}</div>
                        </div>
                      </div>
                      
                      <div className="ml-8">
                        <ul className="text-sm text-gray-300 space-y-1">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center">
                              <span className="w-1 h-1 bg-blue-400 rounded-full mr-2"></span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Plan Notice */}
                <div className="mt-6 p-4 bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-300">
                      <p className="font-medium mb-1">Plan Information</p>
                      <p>You can upgrade or downgrade your plan at any time from your organization settings. All plans include a 14-day free trial.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 border border-gray-500 rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Organization'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateOrgModal;