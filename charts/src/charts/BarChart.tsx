import React from "react";
import { useRef } from "react";
import { useChart } from "../hooks/useChart";

export function BarChart() {
  const elRef = useRef<HTMLDivElement>(null);

  useChart(elRef, {
    title: {
      text: 'ECharts Getting Started Example'
    },
    tooltip: {},
    xAxis: {
      data: ['shirt', 'cardigan', 'chiffon', 'pants', 'heels', 'socks']
    },
    yAxis: {},
    series: [
      {
        name: 'sales',
        type: 'bar',
        data: [5, 20, 36, 10, 10, 20]
      }
    ]
  })

  return <div ref={elRef}/>
}
