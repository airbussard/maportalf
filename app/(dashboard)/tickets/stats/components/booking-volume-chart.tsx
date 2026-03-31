'use client'

import type { ApexOptions } from 'apexcharts'
import dynamic from 'next/dynamic'
import type { GroupBy, BookingDataPoint } from '@/app/actions/calendar-stats'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

interface BookingVolumeChartProps {
  data: BookingDataPoint[]
  groupBy: GroupBy
  showComparison?: boolean
}

export function BookingVolumeChart({ data, groupBy, showComparison = false }: BookingVolumeChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[370px] items-center justify-center text-muted-foreground">
        Keine Buchungen im gewählten Zeitraum
      </div>
    )
  }

  const hasPreviousData = showComparison && data.some(d => (d.previousCount ?? 0) > 0)
  const categories = data.map(d => d.displayLabel)

  const series: { name: string; data: number[] }[] = [
    { name: 'Buchungen', data: data.map(d => d.count) },
  ]
  if (hasPreviousData) {
    series.push({ name: 'Vorjahr', data: data.map(d => d.previousCount ?? 0) })
  }

  const options: ApexOptions = {
    colors: hasPreviousData ? ['#fbb928', '#94a3b8'] : ['#fbb928'],
    chart: {
      type: 'bar',
      stacked: false,
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 3,
        columnWidth: hasPreviousData ? '55%' : '35%',
        borderRadiusApplication: 'end',
      },
    },
    dataLabels: { enabled: false },
    grid: {
      strokeDashArray: 5,
      yaxis: { lines: { show: true } },
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        rotate: groupBy === 'week' ? -45 : 0,
        style: { fontSize: '12px' },
      },
    },
    yaxis: {
      labels: { style: { fontSize: '12px' } },
    },
    legend: {
      show: hasPreviousData,
      position: 'top',
      horizontalAlign: 'left',
      fontFamily: 'inherit',
      fontWeight: 500,
      fontSize: '14px',
      markers: { size: 9, shape: 'circle' },
    },
    fill: { opacity: 1 },
    tooltip: {
      shared: true,
      intersect: false,
    },
  }

  return (
    <div className="-ml-3.5 mt-2">
      <Chart options={options} series={series} type="bar" height={370} />
    </div>
  )
}
