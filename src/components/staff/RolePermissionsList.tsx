import { Check, Minus } from 'lucide-react';

import { type Role } from '@/types/staff';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';
import { HIDDEN_PERMISSION_SLUGS, PERMISSION_GROUPS } from '@/constants/permissions';

export function RolePermissionsList({ role, isPreview }: { role: Role; isPreview: boolean }) {
  return (
    <section>
      <h2 className="m-0 mb-1 text-[15px] font-semibold text-text-primary">
        What {role.name} can do
      </h2>
      <p className="m-0 mb-3 text-[13px] text-text-secondary">
        {isPreview ? 'Preview of the role you’ve selected. ' : ''}Permissions come from the role.
        Edit the role to change them for everyone who has it.
      </p>
      <div className="grid gap-4">
        {PERMISSION_GROUPS.map((group) => {
          const slugs = group.slugs.filter((slug) => !HIDDEN_PERMISSION_SLUGS.includes(slug));
          const grantedCount = slugs.filter((slug) => role.permissions.includes(slug)).length;
          return (
            <Card
              key={group.label}
              flush
              title={group.label}
              actions={
                <span className="text-xs font-normal text-text-tertiary">
                  {grantedCount} of {slugs.length}
                </span>
              }
            >
              <ul className="m-0 list-none p-0">
                {slugs.map((slug, index) => {
                  const isGranted = role.permissions.includes(slug);
                  return (
                    <li
                      key={slug}
                      className={cn(
                        'flex items-start gap-3 px-5 py-3',
                        index > 0 && 'border-t border-border-subtle',
                      )}
                    >
                      <Icon
                        icon={isGranted ? Check : Minus}
                        className={cn(
                          'mt-0.5',
                          isGranted ? 'text-brand-600' : 'text-text-tertiary',
                        )}
                      />
                      <span
                        className={cn(
                          'min-w-0 flex-1 font-mono text-sm',
                          isGranted ? 'text-text-primary' : 'text-text-tertiary',
                        )}
                      >
                        {slug}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
