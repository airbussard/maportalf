'use client'

import type { ApexOptions } from 'apexcharts'
import dynamic from 'next/dynamic'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

interface WeekdayDistributionChartProps {
  data: { weekday: string; count: number }[]
}

export function WeekdayDistributionChart({ data }: WeekdayDistributionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[310px] items-center justify-center text-muted-foreground">
        Keine Daten verfügbar
      </div>
    )
  }

  const categories = data.map(d => d.weekday.substring(0, 2))
  const series = [{ name: 'Tickets', data: data.map(d => d.count) }]

  const options: ApexOptions = {
    colors: ['#3C50E0'],
    chart: {
      type: 'bar',
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 4,
        columnWidth: '45%',
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
    },
    fill: { opacity: 1 },
    tooltip: {
      y: { formatter: (val: number) => `${val} Tickets` },
    },
  }

  return (
    <div className="-ml-3.5 mt-2">
      <Chart options={options} series={series} type="bar" height={310} />
    </div>
  )
}
