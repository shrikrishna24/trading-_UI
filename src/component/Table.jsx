import React from "react";
import './Table.css'

export function Table({columns, data}){
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
                    <td key={colIndex} data-label={column.name}  className={column.type === 'bold' ? "td-bold" : ""}>
                        {column.type === 'link' ? (
                        <a href={`${column.baseUrl}/${row[column.key]}`}>{row[column.key]}</a>
                        ) : (
                        row[column.key] !==null ? row[column.key] : '---'
                        )}
                    </td>
                    ))}
                </tr>
                ))}
            </tbody>
            </table>
        </div>
    )}