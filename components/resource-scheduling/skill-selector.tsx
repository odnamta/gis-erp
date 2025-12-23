'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ResourceSkill } from '@/types/resource-scheduling'
import { getSkills } from '@/lib/resource-scheduling-actions'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SkillSelectorProps {
  value: string[]
  onChange: (skills: string[]) => void
  disabled?: boolean
}

export function SkillSelector({ value, onChange, disabled }: SkillSelectorProps) {
  const [open, setOpen] = useState(false)
  const [skills, setSkills] = useState<ResourceSkill[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSkills() {
      try {
        const data = await getSkills()
        setSkills(data)
      } catch (error) {
        console.error('Failed to load skills:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSkills()
  }, [])

  const toggleSkill = (skillCode: string) => {
    if (value.includes(skillCode)) {
      onChange(value.filter((s) => s !== skillCode))
    } else {
      onChange([...value, skillCode])
    }
  }

  const removeSkill = (skillCode: string) => {
    onChange(value.filter((s) => s !== skillCode))
  }

  const getSkillName = (code: string) => {
    const skill = skills.find((s) => s.skill_code === code)
    return skill?.skill_name || code
  }

  // Group skills by category
  const groupedSkills = skills.reduce((acc, skill) => {
    const category = skill.skill_category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(skill)
    return acc
  }, {} as Record<string, ResourceSkill[]>)

  const categoryLabels: Record<string, string> = {
    engineering: 'Engineering',
    design: 'Design',
    field: 'Field Work',
    operation: 'Operations',
    other: 'Other',
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || loading}
          >
            {loading ? 'Loading skills...' : 'Select skills...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search skills..." />
            <CommandList>
              <CommandEmpty>No skills found.</CommandEmpty>
              {Object.entries(groupedSkills).map(([category, categorySkills]) => (
                <CommandGroup key={category} heading={categoryLabels[category] || category}>
                  {categorySkills.map((skill) => (
                    <CommandItem
                      key={skill.skill_code}
                      value={skill.skill_name}
                      onSelect={() => toggleSkill(skill.skill_code)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value.includes(skill.skill_code) ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span>{skill.skill_name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {skill.skill_code}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected skills */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((skillCode) => (
            <Badge key={skillCode} variant="secondary" className="gap-1">
              {getSkillName(skillCode)}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeSkill(skillCode)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
