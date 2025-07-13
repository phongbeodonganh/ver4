import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Download, Filter, X, User, Mail, Phone, Calendar } from 'lucide-react';
import { studentSearchApi } from '../../services/enhancedApi';

// Search form schema
const searchSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  course: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  logic: z.enum(['AND', 'OR']).optional().default('AND'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional().default('ASC'),
});

type SearchForm = z.infer<typeof searchSchema>;

interface Student {
  IDHV: number;
  TenHV: string;
  Email: string;
  Phone?: string;
  NgayDangKy: string;
  courses: string[];
  totalSpent: number;
  lastActivity: string;
}

interface SearchResult {
  students: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    logic: string;
    appliedFilters: string[];
  };
}

const StudentSearchComponent: React.FC = () => {
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      logic: 'AND',
      sortBy: 'NgayDangKy',
      sortOrder: 'DESC'
    }
  });

  const watchedValues = watch();

  // Perform search
  const onSubmit = async (data: SearchForm) => {
    setLoading(true);
    try {
      const result = await studentSearchApi.search({
        ...data,
        page: currentPage,
        limit: 10
      });
      setSearchResults(result.data);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = async (newPage: number) => {
    setCurrentPage(newPage);
    setLoading(true);
    try {
      const result = await studentSearchApi.search({
        ...watchedValues,
        page: newPage,
        limit: 10
      });
      setSearchResults(result.data);
    } catch (error) {
      console.error('Page change failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Export results
  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      const blob = await studentSearchApi.export(watchedValues, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students_export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  // Clear filters
  const clearFilters = () => {
    reset({
      logic: 'AND',
      sortBy: 'NgayDangKy',
      sortOrder: 'DESC'
    });
    setSearchResults(null);
    setCurrentPage(1);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Student Search</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Filter className="h-4 w-4" />
          <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
        </button>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Quick Search */}
        <div className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              {...register('name')}
              placeholder="Search by name..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Search className="h-4 w-4" />
            <span>{loading ? 'Searching...' : 'Search'}</span>
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="Enter email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  {...register('phone')}
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Course */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course
                </label>
                <input
                  type="text"
                  {...register('course')}
                  placeholder="Enter course name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  {...register('status')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration From
                </label>
                <input
                  type="date"
                  {...register('dateFrom')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration To
                </label>
                <input
                  type="date"
                  {...register('dateTo')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Search Logic and Sorting */}
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Logic
                </label>
                <select
                  {...register('logic')}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="AND">AND (All conditions)</option>
                  <option value="OR">OR (Any condition)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  {...register('sortBy')}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="NgayDangKy">Registration Date</option>
                  <option value="TenHV">Name</option>
                  <option value="Email">Email</option>
                  <option value="totalSpent">Total Spent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order
                </label>
                <select
                  {...register('sortOrder')}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ASC">Ascending</option>
                  <option value="DESC">Descending</option>
                </select>
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Results */}
      {searchResults && (
        <div className="mt-6">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              Found {searchResults.pagination.total} students 
              {searchResults.filters.appliedFilters.length > 0 && (
                <span className="ml-2">
                  (Filters: {searchResults.filters.appliedFilters.join(', ')})
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleExport('csv')}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center space-x-1"
              >
                <Download className="h-3 w-3" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center space-x-1"
              >
                <Download className="h-3 w-3" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Student</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Contact</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Courses</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Registration</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Total Spent</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.students.map((student) => (
                  <tr key={student.IDHV} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{student.TenHV}</div>
                          <div className="text-sm text-gray-500">ID: {student.IDHV}</div>
                        </div>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-sm">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span>{student.Email}</span>
                        </div>
                        {student.Phone && (
                          <div className="flex items-center space-x-1 text-sm">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{student.Phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <div className="space-y-1">
                        {student.courses.map((course, index) => (
                          <span
                            key={index}
                            className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1"
                          >
                            {course}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <div className="flex items-center space-x-1 text-sm">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>{formatDate(student.NgayDangKy)}</span>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span className="font-medium text-green-600">
                        {formatCurrency(student.totalSpent)}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span className="text-sm text-gray-600">
                        {formatDate(student.lastActivity)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {searchResults.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Page {searchResults.pagination.page} of {searchResults.pagination.totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(searchResults.pagination.page - 1)}
                  disabled={searchResults.pagination.page === 1 || loading}
                  className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, searchResults.pagination.totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      disabled={loading}
                      className={`px-3 py-1 border rounded text-sm ${
                        page === searchResults.pagination.page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(searchResults.pagination.page + 1)}
                  disabled={searchResults.pagination.page === searchResults.pagination.totalPages || loading}
                  className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Searching...</span>
        </div>
      )}

      {/* No Results */}
      {searchResults && searchResults.students.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No students found matching your criteria.
        </div>
      )}
    </div>
  );
};

export default StudentSearchComponent;
