import React, { useMemo } from 'react';
import EnhancedDropdown from './EnhancedDropdown';

const YearDropdown = ({
  selectedYear,
  onYearSelect,
  minYear = 1900,
  maxYear = null,
  showAllYears = true,
  className = "",
  disabled = false
}) => {
  const currentYear = new Date().getFullYear();
  const endYear = maxYear || currentYear;

  // Generate year options
  const yearOptions = useMemo(() => {
    const years = [];
    
    // Add "All Years" option
    if (showAllYears) {
      years.push({
        value: null,
        label: 'All Years',
        year: null
      });
    }

    // Add individual years only
    for (let year = endYear; year >= minYear; year--) {
      years.push({
        value: year,
        label: year.toString(),
        year: year
      });
    }

    return years;
  }, [minYear, endYear, showAllYears]);


  // Handle year selection
  const handleYearSelect = (option) => {
    onYearSelect(option?.year || null);
  };

  // Custom render for year options
  const renderYearOption = (option, index) => {
    return (
      <div className="flex items-center justify-between">
        <span>{option.label}</span>
      </div>
    );
  };

  // Custom render for selected year
  const renderSelectedYear = (selected) => {
    if (!selected) {
      return <span>Year</span>;
    }

    return <span>{selected}</span>;
  };

  return (
    <EnhancedDropdown
      options={yearOptions}
      selectedValue={selectedYear}
      onSelect={handleYearSelect}
      placeholder="Year"
      searchable={false}
      searchPlaceholder="Search years..."
      className={className}
      disabled={disabled}
      groupBy={null}
      renderOption={renderYearOption}
      renderSelected={renderSelectedYear}
      emptyMessage="No years found"
      icon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      }
    />
  );
};

export default YearDropdown;
