import React from "react";
import './Table.css';

export function Table({columns, data}) {
  // Function to apply class based on value
  const getValueClass = (value, columnKey) => {
    if (columnKey === 'pc') {
      // Handle numeric values
      const numericValue = parseFloat(value);
      if (!isNaN(numericValue)) {
        return numericValue >= 0 ? 'positive' : 'negative';
      }
    }
    return '';
  };

  return(
    <div className="adviosrytable-content">
      <table className="adviosrytable">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index}>
                {column.name}
                <span className="unit">{column.unit ? column.unit : ""}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              {columns.map((column, colIndex) => (
                <td key={colIndex} data-label={column.name} className={`${column.type === 'bold' ? "td-bold" : ""} ${getValueClass(row[column.key], column.key)}`}>
                  {column.type === 'link' ? (
                    <a href={`${column.baseUrl}/${row[column.key]}`}>{row[column.key]}</a>
                  ) : (
                    row[column.key] !== null ? row[column.key] : '---'
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}