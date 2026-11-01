import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type DeliveryZone } from '@/types/sales';
import { customRenderAtRoute } from '@/tests/customRender';
import { buildMoney } from '@/tests/fixtures/catalogue';
import { buildDeliveryZoneFixture } from '@/tests/fixtures/sales';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';

type Request = { method: string; zoneId?: string; body?: unknown };

function respondWithZones(
  initialZones: DeliveryZone[],
  { permissions }: { permissions?: string[] } = {},
) {
  let zones = initialZones;
  let nextId = 100;
  const requests: Request[] = [];
  const user = buildUserFixture();
  if (permissions) user.memberships[0].permissions = permissions;
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: user })),
    http.get(mockEndpoints.deliveryZones, () =>
      HttpResponse.json({
        data: [...zones].sort(
          (first, second) =>
            first.country.localeCompare(second.country) ||
            first.sort_order - second.sort_order ||
            first.id - second.id,
        ),
      }),
    ),
    http.post(mockEndpoints.deliveryZones, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      requests.push({ method: 'POST', body });
      const zone = buildDeliveryZoneFixture({
        id: nextId++,
        country: body.country as string,
        name: body.name as string,
        fee: buildMoney(body.fee as string),
        is_active: body.is_active as boolean,
        sort_order: body.sort_order as number,
      });
      zones = [...zones, zone];
      return HttpResponse.json({ data: zone }, { status: 201 });
    }),
    http.patch(mockEndpoints.deliveryZone, async ({ request, params }) => {
      const body = (await request.json()) as Record<string, unknown>;
      requests.push({ method: 'PATCH', zoneId: params.zoneId as string, body });
      zones = zones.map((zone) =>
        String(zone.id) === params.zoneId
          ? {
              ...zone,
              ...body,
              fee: typeof body.fee === 'string' ? buildMoney(body.fee) : zone.fee,
            }
          : zone,
      );
      return HttpResponse.json({
        data: zones.find((zone) => String(zone.id) === params.zoneId),
      });
    }),
    http.delete(mockEndpoints.deliveryZone, ({ params }) => {
      requests.push({ method: 'DELETE', zoneId: params.zoneId as string });
      zones = zones.filter((zone) => String(zone.id) !== params.zoneId);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return requests;
}

const kenyaZones = [
  buildDeliveryZoneFixture({ id: 1, name: 'Nairobi CBD', fee: buildMoney('200.00') }),
  buildDeliveryZoneFixture({ id: 2, name: 'Mombasa', fee: buildMoney('450.00'), sort_order: 1 }),
  buildDeliveryZoneFixture({
    id: 3,
    name: 'Shop pickup',
    fee: buildMoney('0.00'),
    sort_order: 2,
    is_active: false,
  }),
];

function zonesTable() {
  return within(screen.getByRole('table', { name: 'Delivery zones' }));
}

function zoneRow(name: string) {
  return within(zonesTable().getByText(name).closest('[role="row"]') as HTMLElement);
}

describe('Delivery zones', () => {
  it('lists each country’s zones with fees and the checkout preview', async () => {
    respondWithZones([
      ...kenyaZones,
      buildDeliveryZoneFixture({ id: 4, country: 'UG', name: 'Kampala' }),
    ]);
    customRenderAtRoute({ url: '/delivery-zones' });

    expect(await screen.findByRole('heading', { name: 'Delivery zones' })).toBeVisible();
    expect(screen.getByRole('tab', { name: /Kenya/ })).toHaveTextContent('2');
    expect(screen.getByRole('tab', { name: /Uganda/ })).toBeVisible();

    expect(await screen.findByRole('table', { name: 'Delivery zones' })).toBeVisible();
    expect(zoneRow('Mombasa').getByText('KES 450.00')).toBeVisible();
    expect(zoneRow('Shop pickup').getByText('Free')).toBeVisible();
    expect(zoneRow('Shop pickup').getByText('Off')).toBeVisible();
    expect(screen.getByText('What a buyer in Kenya sees')).toBeVisible();
  });

  it('warns when no zone in the country is on', async () => {
    respondWithZones([kenyaZones[2]]);
    customRenderAtRoute({ url: '/delivery-zones' });

    expect(
      await screen.findByText(/No zones are on, so buyers in Kenya can’t choose delivery/),
    ).toBeVisible();
    expect(screen.getByText('No zones on — delivery can’t be chosen at checkout.')).toBeVisible();
  });

  it('adds a zone at the end of the country’s list', async () => {
    const user = userEvent.setup();
    const requests = respondWithZones(kenyaZones);
    customRenderAtRoute({ url: '/delivery-zones' });

    await user.click(await screen.findByRole('button', { name: 'Add zone' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Add zone' }));
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'mombasa');
    await user.type(dialog.getByRole('textbox', { name: 'Fee' }), '300');
    await user.click(dialog.getByRole('button', { name: 'Add zone' }));
    expect(
      await dialog.findByText('A zone with this name already exists for Kenya.'),
    ).toBeVisible();

    await user.clear(dialog.getByRole('textbox', { name: 'Name' }));
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'Kisumu');
    await user.click(dialog.getByRole('button', { name: 'Add zone' }));

    expect(await screen.findByText('Zone added')).toBeVisible();
    expect(requests).toEqual([
      {
        method: 'POST',
        body: { country: 'KE', name: 'Kisumu', fee: '300.00', is_active: true, sort_order: 3 },
      },
    ]);
    expect(await zonesTable().findByText('Kisumu')).toBeVisible();
  });

  it('edits a zone’s fee', async () => {
    const user = userEvent.setup();
    const requests = respondWithZones(kenyaZones);
    customRenderAtRoute({ url: '/delivery-zones' });

    await user.click(await screen.findByRole('button', { name: 'Edit Mombasa' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit zone' }));
    expect(dialog.getByText('Fee changes apply to new orders only.')).toBeVisible();
    await user.clear(dialog.getByRole('textbox', { name: 'Fee' }));
    await user.type(dialog.getByRole('textbox', { name: 'Fee' }), '500');
    await user.click(dialog.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Zone saved')).toBeVisible();
    expect(requests).toEqual([
      {
        method: 'PATCH',
        zoneId: '2',
        body: { name: 'Mombasa', fee: '500.00', is_active: true },
      },
    ]);
    expect(await zonesTable().findByText('KES 500.00')).toBeVisible();
  });

  it('switches a zone on and off at checkout', async () => {
    const user = userEvent.setup();
    const requests = respondWithZones(kenyaZones);
    customRenderAtRoute({ url: '/delivery-zones' });

    await user.click(await screen.findByRole('switch', { name: 'Show Shop pickup at checkout' }));

    expect(await screen.findByText('Zone live at checkout')).toBeVisible();
    expect(requests).toEqual([{ method: 'PATCH', zoneId: '3', body: { is_active: true } }]);
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Show Shop pickup at checkout' })).toBeChecked(),
    );
  });

  it('moves a zone down, renumbering only the zones that moved', async () => {
    const user = userEvent.setup();
    const requests = respondWithZones(kenyaZones);
    customRenderAtRoute({ url: '/delivery-zones' });

    expect(await screen.findByRole('button', { name: 'Move Nairobi CBD up' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Move Nairobi CBD down' }));

    await waitFor(() =>
      expect(requests).toEqual([
        { method: 'PATCH', zoneId: '2', body: { sort_order: 0 } },
        { method: 'PATCH', zoneId: '1', body: { sort_order: 1 } },
      ]),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Move Mombasa up' })).toBeDisabled(),
    );
  });

  it('deletes a zone after confirming', async () => {
    const user = userEvent.setup();
    const requests = respondWithZones(kenyaZones);
    customRenderAtRoute({ url: '/delivery-zones' });

    await user.click(await screen.findByRole('button', { name: 'Delete Mombasa' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Delete Mombasa?' }));
    await user.click(dialog.getByRole('button', { name: 'Delete zone' }));

    expect(await screen.findByText('Zone deleted')).toBeVisible();
    expect(requests).toEqual([{ method: 'DELETE', zoneId: '2' }]);
    await waitFor(() => expect(zonesTable().queryByText('Mombasa')).not.toBeInTheDocument());
  });

  it('adds a country tab, then its first zone', async () => {
    const user = userEvent.setup();
    const requests = respondWithZones(kenyaZones);
    customRenderAtRoute({ url: '/delivery-zones' });

    await user.click(await screen.findByRole('button', { name: 'Add country' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Add country' }));
    await user.selectOptions(
      dialog.getByRole('combobox', { name: 'Country' }),
      dialog.getByRole('option', { name: 'Rwanda' }),
    );
    await user.click(dialog.getByRole('button', { name: 'Add' }));

    expect(await screen.findByRole('tab', { name: 'Rwanda', selected: true })).toBeVisible();
    expect(screen.getByText('No zones for Rwanda')).toBeVisible();

    await user.click(screen.getAllByRole('button', { name: 'Add zone' })[0]);
    const zoneDialog = within(await screen.findByRole('dialog', { name: 'Add zone' }));
    await user.type(zoneDialog.getByRole('textbox', { name: 'Name' }), 'Kigali');
    await user.type(zoneDialog.getByRole('textbox', { name: 'Fee' }), '1200');
    await user.click(zoneDialog.getByRole('button', { name: 'Add zone' }));

    await screen.findByText('Zone added');
    expect(requests[0]).toMatchObject({ body: { country: 'RW', name: 'Kigali', sort_order: 0 } });
  });

  it('is read-only without fulfilment.manage', async () => {
    respondWithZones(kenyaZones, { permissions: ['orders.view'] });
    customRenderAtRoute({ url: '/delivery-zones' });

    await screen.findByRole('table', { name: 'Delivery zones' });
    expect(screen.queryByRole('button', { name: 'Add zone' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Mombasa' })).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Show Mombasa at checkout' })).toBeDisabled();
  });

  it('shows an empty state for a store without zones', async () => {
    respondWithZones([]);
    customRenderAtRoute({ url: '/delivery-zones' });

    expect(await screen.findByText('No delivery zones yet')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add country' })).toBeVisible();
  });
});
