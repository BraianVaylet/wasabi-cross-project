import type { Plan } from '@wasabi-cross/schemas';
import { Button, Card, SectionHeader, Tag } from '@wasabi-cross/ui';
import { useState } from 'react';
import {
  PLAN_CHANGE_UNAVAILABLE,
  PLAN_INFO,
  PLAN_ORDER,
  type PlanFeature,
} from '../../lib/plans.ts';
import './subscription.css';

export interface SubscriptionPageProps {
  plan: Plan;
}

/**
 * Suscripción (spec §5.5): el plan actual, lo que se paga y los dos planes, con el botón para
 * pasar de uno al otro.
 *
 * Es sólo la UI. No hay pasarela de pago ni endpoint para cambiar de plan (ADR-0011), así que el
 * botón avisa que todavía no se puede y no llama a nada.
 */
export function SubscriptionPage({ plan }: SubscriptionPageProps): React.JSX.Element {
  const [asked, setAsked] = useState<Plan | null>(null);
  const current = PLAN_INFO[plan];

  return (
    <>
      <SectionHeader level={1} title="Suscripción" />

      <section className="subscription__section" aria-labelledby="subscription-actual">
        <SectionHeader level={2} id="subscription-actual" title="Tu plan actual" divider={false} />
        <Card variant="current">
          <dl className="subscription__facts">
            <div className="subscription__fact">
              <dt>Plan</dt>
              <dd>
                <Tag variant={plan === 'pro' ? 'solid' : 'neutral'}>{current.name}</Tag>
              </dd>
            </div>
            <div className="subscription__fact">
              <dt>Lo que pagás</dt>
              <dd className="subscription__amount">{current.price}</dd>
            </div>
          </dl>
        </Card>
        {plan === 'pro' ? (
          <p className="subscription__hint">
            Todavía no se cobra: el precio se define cuando llegue el pago.
          </p>
        ) : null}
      </section>

      <section className="subscription__section" aria-labelledby="subscription-planes">
        <SectionHeader level={2} id="subscription-planes" title="Planes" divider={false} />
        <ul className="subscription__plans">
          {PLAN_ORDER.map((id) => (
            <li key={id}>
              <PlanCard
                id={id}
                isCurrent={id === plan}
                onChoose={() => {
                  setAsked(id);
                }}
              />
            </li>
          ))}
        </ul>
        {asked === null ? null : (
          <p className="subscription__notice" role="status">
            {PLAN_CHANGE_UNAVAILABLE}
          </p>
        )}
      </section>
    </>
  );
}

interface PlanCardProps {
  id: Plan;
  isCurrent: boolean;
  onChoose: () => void;
}

function PlanCard({ id, isCurrent, onChoose }: PlanCardProps): React.JSX.Element {
  const info = PLAN_INFO[id];
  const headingId = `subscription-plan-${id}`;

  return (
    <Card
      variant={isCurrent ? 'current' : 'past'}
      className="subscription__plan"
      role="group"
      aria-labelledby={headingId}
    >
      <div className="subscription__plan-head">
        <h3 id={headingId} className="subscription__plan-name">
          {info.name}
        </h3>
        {isCurrent ? <Tag variant="solid">Tu plan actual</Tag> : null}
      </div>
      <p className="subscription__price">{info.price}</p>
      <ul className="subscription__features">
        {info.features.map((feature) => (
          <Feature key={feature.label} feature={feature} />
        ))}
      </ul>
      {isCurrent ? null : (
        <Button variant={id === 'pro' ? 'primary' : 'secondary'} block onClick={onChoose}>
          {`Pasar a ${info.name}`}
        </Button>
      )}
    </Card>
  );
}

/**
 * Una línea de lo que incluye el plan. La marca (✓ o ✕) es decoración: el lector de pantalla oye
 * "Incluye" o "No incluye", así lo que no tiene Free no depende de un símbolo ni de un color.
 */
function Feature({ feature }: { feature: PlanFeature }): React.JSX.Element {
  return (
    <li
      className={`subscription__feature subscription__feature--${feature.included ? 'yes' : 'no'}`}
    >
      <span aria-hidden="true" className="subscription__mark">
        {feature.included ? '✓' : '✕'}
      </span>
      <span className="wc-visually-hidden">{feature.included ? 'Incluye: ' : 'No incluye: '}</span>
      {feature.label}
    </li>
  );
}
