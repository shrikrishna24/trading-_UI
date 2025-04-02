import React, { useState, useEffect, useRef } from "react";
import ReactECharts from "echarts-for-react";
import jsonData from "../assets/last_5_days_data.json"; // Import JSON file
import moment from "moment-timezone";
import { Table } from "./Table";

const groupByDay = (data) => {
  const groupedData = {};
  data.forEach((item) => {
    const date = moment.utc(item.timestamp).tz("Asia/Kolkata").format("YYYY-MM-DD");
    if (!groupedData[date]) groupedData[date] = [];
    groupedData[date].push(item);
  });
  return groupedData;
};

const TradingViewChart = () => {
  const groupedData = groupByDay(jsonData);
  const days = Object.keys(groupedData);

  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [fullDayData, setFullDayData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [index, setIndex] = useState(0);
  const chartRef = useRef(null);
  const [markPoints, setMarkPoints] = useState([]);

  const [exitLogs, setExitLogs] = useState([]);

  
  useEffect(() => {
    const dayData = groupedData[selectedDay];
    setFullDayData(dayData);
    setDisplayData(
      dayData.map((d) => ({
        timestamp: d.timestamp,
        open: null,
        high: null,
        low: null,
        close: null,
        RSI: null,
        entry_price: d.entry_price,
        signal: d.signal,
      }))
    );
    setIndex(0);
    setMarkPoints([]); // Reset markers when changing days
  }, [selectedDay]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (index < fullDayData.length) {
        const newPoint = fullDayData[index];

        // Update displayed data progressively
        setDisplayData((prev) =>
          prev.map((item, i) =>
            i === index
              ? {
                ...item,
                open: newPoint.open_1m,
                high: newPoint.high_1m,
                low: newPoint.low_1m,
                close: newPoint.close_1m,
                RSI: newPoint.RSI_1m,
                entry_price: newPoint.entry_price,
                signal: newPoint.signal,
              }
              : item
          )
        );
        setMarkPoints((prev) => {
          const lastEntry = prev.length ? prev[prev.length - 1] : null;
          const lastEntryPrice = lastEntry ? lastEntry.coord[1] : null;
          const isTradeActive = prev.some((marker) => marker.name === "Entry" && marker.coord[1] === newPoint.entry_price);

          // Only add an Entry marker when a new trade starts, and it hasn't been plotted before
          if (
            newPoint.signal !== "HOLD" &&
            newPoint.signal !== "SQUARE OFF PUT (Stop-Loss Hit)" &&
            newPoint.entry_price !== lastEntryPrice &&
            !isTradeActive // Ensure no duplicate entry markers
          ) {
            const newMarkers = [
              {
                name: "Entry",
                coord: [moment.utc(newPoint.timestamp).tz("Asia/Kolkata").format("HH:mm:ss"), newPoint.entry_price],
                value: `Entry\n${newPoint.entry_price}`,
                symbol: "pin",
                symbolSize: 20,
                label: { show: true, position: "top", formatter: `{b}\n{c}` },
                itemStyle: { color: "green" },
              },
            ];

            // Ensure SL appears only once per trade
            const existingSL = prev.some((marker) => marker.name === "SL" && marker.coord[1] === newPoint.stop_loss);
            if (newPoint.stop_loss && newPoint.stop_loss !== newPoint.entry_price && !existingSL) {
              newMarkers.push({
                name: "SL",
                coord: [moment.utc(newPoint.timestamp).tz("Asia/Kolkata").format("HH:mm:ss"), newPoint.stop_loss],
                value: `SL\n${newPoint.stop_loss}`,
                symbol: "pin",
                symbolSize: 20,
                label: { show: true, position: "bottom", formatter: `{b}\n{c}` },
                itemStyle: { color: "red" },
              });
            }

            return [...prev, ...newMarkers];
          }

          if (
            (newPoint.signal.includes("SQUARE OFF") || newPoint.signal.includes("EXIT")) &&
            newPoint.entry_price &&
            newPoint.signal
          ) {
            setExitLogs((prevLogs) => {
              const timestamp = moment.utc(newPoint.timestamp).tz("Asia/Kolkata").format("HH:mm:ss");
              const alreadyLogged = prevLogs.some(
                (log) =>
                  log.entry_price === newPoint.entry_price &&
                  log.timestamp === timestamp
              );
          
              if (alreadyLogged) return prevLogs;
          
              const exit_price = newPoint.close_1m;
              const pc = parseFloat((exit_price - newPoint.entry_price).toFixed(2));
              const trade_type = newPoint.signal.includes("CALL")
                ? "CALL"
                : newPoint.signal.includes("PUT")
                ? "PUT"
                : "UNKNOWN";
          
              return [
                ...prevLogs,
                {
                  timestamp,
                  entry_price: newPoint.entry_price,
                  stop_loss: newPoint.stop_loss || null,
                  exit_price,
                  trade_type,
                  signal: newPoint.signal,
                  pc,
                },
              ];
            });
          }
          
          return prev;
        });

        // Move to the next data point in the interval
        setIndex((prev) => prev + 1);



      } else {
        clearInterval(interval);
      }
    }, 0);

    return () => clearInterval(interval);
  }, [index, fullDayData]);
  
  // Extract OHLC data for candlestick chart
  const ohlcData = displayData.map((d) => [d.open, d.close, d.low, d.high]).filter((candle) => candle[0] !== null);
  const rsiData = displayData.map((d) => d.RSI).filter((RSI) => RSI !== null);
  const timestamps = displayData.map((d) =>
    moment.utc(d.timestamp).tz("Asia/Kolkata").format("HH:mm:ss")
  );

  // Calculate min/max for Close Price with a 100-point buffer
  const closePrices = displayData.map((d) => d.close).filter((val) => val !== null);
  const minClose = Math.min(...closePrices, Infinity);
  const maxClose = Math.max(...closePrices, -Infinity);
  const buffer = 100;
  const yMin = minClose !== Infinity ? minClose - buffer : 0;
  const yMax = maxClose !== -Infinity ? maxClose + buffer : 2000;

  const option = {
    title: [
      { right: "8%", text: "Price Chart" },
      { top: "62%", right: "10%", text: "RSI" },
    ],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
    },
    legend: { data: ["Candlestick", "RSI"] },
    dataZoom: [
      { type: "inside", xAxisIndex: [0, 1], start: 0, end: 100 },
      { type: "slider", xAxisIndex: [0, 1], start: 0, end: 100 },
    ],
    grid: [
      { bottom: "50%", left: "5%" },
      { top: "70%", left: "5%" },
    ],
    xAxis: [
      { type: "category", data: timestamps, gridIndex: 0 },
      { type: "category", data: timestamps, gridIndex: 1 },
    ],
    yAxis: [
      { type: "value", name: "Price", gridIndex: 0, min: yMin, max: yMax, scale: true },
      { type: "value", name: "RSI", gridIndex: 1, min: 0, max: 100 },
    ],
    series: [
      {
        name: "Candlestick",
        type: "candlestick",
        data: ohlcData,
        xAxisIndex: 0,
        yAxisIndex: 0,
        markPoint: { data: markPoints }, // Add progressive entry markers
      },
      {
        name: "RSI",
        type: "line",
        data: rsiData,
        xAxisIndex: 1,
        yAxisIndex: 1,
        smooth: true,
        areaStyle: { opacity: 0.3 },
        lineStyle: { width: 2, color: "#8884d8" },
      },
    ],
  };

  const columns = [
    {
      name: 'Time',
      key: 'timestamp',
    },
    {
      name: 'Entry Price',
      key: 'entry_price',
    },
    {
      name: 'Stop Loss',
      key: 'stop_loss',
    },
    {
      name: 'Trade Type',
      key: 'trade_type',
    },
    {
      name: 'Signal',
      key: 'signal',
    },
    {
      name: 'Points Capture',
      key: 'pc',
    },
    
  ] 

  return (
  <>
  <ReactECharts ref={chartRef} option={option} style={{ height: "100vh", width: "100%" }} />
    {exitLogs.length>0 && <Table columns={columns} data={exitLogs}/>}
  </>
  )
};

export default TradingViewChart;
