import * as echarts from 'echarts/core';
import { BarChart, LineChart, RadarChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  LegendComponent,
} from 'echarts/components';

import { LabelLayout, UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import type { ComposeOption } from 'echarts/core';

import type {
  BarSeriesOption,
  LineSeriesOption,
  RadarSeriesOption,
  PieSeriesOption,
} from 'echarts/charts';

import type {
  TitleComponentOption,
  TooltipComponentOption,
  GridComponentOption,
  DatasetComponentOption,
} from 'echarts/components';

type ECOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | RadarSeriesOption
  | TitleComponentOption
  | TooltipComponentOption
  | GridComponentOption
  | DatasetComponentOption
  | PieSeriesOption
>;

echarts.use([
  RadarChart,
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  LegendComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
]);

import { RefObject, useEffect, useRef } from 'react';

export function useChart<Opt extends ECOption>(el: RefObject<HTMLElement>, opts: Opt) {
  const chartRef = useRef<echarts.EChartsType>(null);

  useEffect(() => {
    function resize() {
      chartRef.current?.resize();
    }

    if (el.current) {
      el.current.style.width = '100%';
      el.current.style.height = '100%';

      let instance = echarts.init(el.current);

      chartRef.current = instance;
      window.addEventListener('resize', resize);

      const observer = new ResizeObserver((entries) => {
        instance.resize();
      });

      observer.observe(el.current);
    }

    return () => {
      window.removeEventListener('resize', resize);
      chartRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (chartRef.current) {
      console.log('opts', opts);
      // Use time out to see the animation
      setTimeout(() => {
        chartRef.current.setOption(opts, { notMerge: true, lazyUpdate: true });
      }, 100);
    }
  }, [opts]);
}
