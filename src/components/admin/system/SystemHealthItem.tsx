type HealthStatus = 'healthy' | 'warning' | 'error'

type SystemHealthItemProps = {
  name: string
  description: string
  status: HealthStatus
}

const statusConfig = {
  healthy: {
    color: 'bg-green-500',
    textColor: 'text-green-600',
    label: 'Healthy',
  },
  warning: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    label: 'Warning',
  },
  error: {
    color: 'bg-red-500',
    textColor: 'text-red-600',
    label: 'Error',
  },
}

export function SystemHealthItem({
  name,
  description,
  status,
}: SystemHealthItemProps) {
  const config = statusConfig[status]

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`size-3 rounded-full ${config.color}`} />
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <span className={`text-sm font-semibold ${config.textColor}`}>
        {config.label}
      </span>
    </div>
  )
}
