import React, { useState, useEffect, useRef } from "react";
import ReactECharts from "echarts-for-react";
import moment from "moment-timezone";
import jsonData from "../assets/last_5_days_data.json"; // Import JSON file

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
        stop_loss: d.stop_loss,
        take_profit: d.take_profit,
        signal: d.signal,
      }))
    );
    setIndex(0);
  }, [selectedDay]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (index < fullDayData.length) {
        setDisplayData((prev) =>
          prev.map((item, i) =>
            i === index
              ? {
                  ...item,
                  open: fullDayData[i].open_1m,
                  high: fullDayData[i].high_1m,
                  low: fullDayData[i].low_1m,
                  close: fullDayData[i].close_1m,
                  RSI: fullDayData[i].RSI_1m,
                  entry_price: fullDayData[i].entry_price,
                  stop_loss: fullDayData[i].stop_loss,
                  take_profit: fullDayData[i].take_profit,
                  signal: fullDayData[i].signal,
                }
              : item
          )
        );
        setIndex((prev) => prev + 1);
      } else {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [index, fullDayData]);

  // Extract OHLC data
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

  // Generate Clean Mark Points (Entry Price, SL, TP)
  const markPoints = [];

  let tradeStart = null;
  let tradeEnd = null;

  displayData.forEach((d, i) => {
    if (d.signal !== "HOLD") {
      if (!tradeStart) {
        tradeStart = { index: i, price: d.entry_price, time: timestamps[i] };
      }
      tradeEnd = { index: i, price: d.entry_price, time: timestamps[i] };
    }

    // SL & TP only at trade entry points
    if (tradeStart && i === tradeStart.index) {
      markPoints.push({
        name: "Entry",
        coord: [tradeStart.time, tradeStart.price],
        value: `Entry\n${tradeStart.price}`,
        symbol: "circle",
        symbolSize: 10,
        label: { show: true, position: "top", formatter: `{b}\n{c}` },
        itemStyle: { color: "green" },
      });

      if (d.stop_loss) {
        markPoints.push({
          name: "SL",
          coord: [tradeStart.time, d.stop_loss],
          value: `SL\n${d.stop_loss}`,
          symbol: "circle",
          symbolSize: 10,
          label: { show: true, position: "top", formatter: `{b}\n{c}` },
          itemStyle: { color: "red" },
        });
      }

      if (d.take_profit) {
        markPoints.push({
          name: "TP",
          coord: [tradeStart.time, d.take_profit],
          value: `TP\n${d.take_profit}`,
          symbol: "circle",
          symbolSize: 10,
          label: { show: true, position: "top", formatter: `{b}\n{c}` },
          itemStyle: { color: "blue" },
        });
      }
    }
  });

  // Ensure entry is shown only at start and end
  if (tradeStart && tradeEnd && tradeStart.index !== tradeEnd.index) {
    markPoints.push({
      name: "Exit",
      coord: [tradeEnd.time, tradeEnd.price],
      value: `Exit\n${tradeEnd.price}`,
      symbol: "circle",
      symbolSize: 10,
      label: { show: true, position: "top", formatter: `{b}\n{c}` },
      itemStyle: { color: "green" },
    });
  }

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
        markPoint: { data: markPoints }, // Add cleaner entry/SL/TP markers
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

  return <ReactECharts ref={chartRef} option={option} style={{ height: "100vh", width: "100%" }} />;
};

export default TradingViewChart;
