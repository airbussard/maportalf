'use client'

import type { ApexOptions } from 'apexcharts'
import dynamic from 'next/dynamic'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

interface TicketVolumeChartProps {
  data: { date: string; count: number }[]
}

export function TicketVolumeChart({ data }: TicketVolumeChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[310px] items-center justify-center text-muted-foreground">
        Keine Daten verfügbar
      </div>
    )
  }

  const categories = data.map(item =>
    new Date(item.date).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })
  )
  const series = [{ name: 'Tickets', data: data.map(item => item.count) }]

  const options: ApexOptions = {
    colors: ['#fbb928'],
    chart: {
      type: 'area',
      height: 310,
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.55, opacityTo: 0 },
    },
    stroke: { curve: 'smooth', width: 3 },
    grid: {
      strokeDashArray: 5,
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: '12px' } },
    },
    yaxis: { labels: { style: { fontSize: '12px' } } },
    tooltip: { marker: { show: true } },
  }

  return (
    <div className="-ml-4 -mr-5">
      <Chart options={options} series={series} type="area" height={310} />
    </div>
  )
}
