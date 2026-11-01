import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { type DeliveryListItem } from '@/types/sales';
import { customRenderAtRoute } from '@/tests/customRender';
import { buildPaginated } from '@/tests/fixtures/catalogue';
import { buildCourierFixture, buildDeliveryListItemFixture } from '@/tests/fixtures/sales';
import { buildUserFixture } from '@/tests/fixtures/user';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { server } from '@/tests/mocks/server';
import { formatDateTime } from '@/utils/movementTime';

function respondWithDeliveries(deliveries: DeliveryListItem[]) {
  const requests: URLSearchParams[] = [];
  server.use(
    http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })),
    http.get(mockEndpoints.couriers, () =>
      HttpResponse.json({
        data: [
          buildCourierFixture({ id: 1, name: 'Swift Riders' }),
          buildCourierFixture({ id: 2, name: 'Old Courier', is_active: false }),
        ],
      }),
    ),
    http.get(mockEndpoints.deliveries, ({ request }) => {
      requests.push(new URL(request.url).searchParams);
      return HttpResponse.json(buildPaginated(deliveries));
    }),
  );
  return requests;
}

describe('Deliveries list', () => {
  it('lists deliveries with order link, method, courier, tracking, status and times', async () => {
    respondWithDeliveries([
      buildDeliveryListItemFixture({
        id: 7,
        status: 'in_transit',
        status_label: 'In transit',
        tracking_number: 'KE88213',
        dispatched_at: '2026-10-18T10:00:00+00:00',
      }),
      buildDeliveryListItemFixture({
        id: 8,
        order_reference: 'AB12-CD34-EF56',
        method: 'pickup',
        courier_name: null,
        status: 'dispatched',
        status_label: 'Ready for collection',
      }),
    ]);
    customRenderAtRoute({ url: '/deliveries' });

    expect(await screen.findByRole('heading', { name: 'Deliveries' })).toBeVisible();
    expect(
      screen.getByText(
        'One per dispatched order. Deliveries are created from the order page and never deleted.',
      ),
    ).toBeVisible();
    const link = await screen.findByRole('link', { name: 'ZN7K-Q4M2-X9TD' });
    expect(link).toHaveAttribute('href', '/deliveries/7');
    const courierRow = within(link.closest('tr') as HTMLElement);
    expect(courierRow.getByText('Courier')).toBeVisible();
    expect(courierRow.getByText('Swift Riders')).toBeVisible();
    expect(courierRow.getByText('KE88213')).toBeVisible();
    expect(courierRow.getByText('In transit')).toBeVisible();
    expect(courierRow.getByText(formatDateTime('2026-10-18T10:00:00+00:00'))).toBeVisible();

    const pickupLink = screen.getByRole('link', { name: 'AB12-CD34-EF56' });
    expect(pickupLink).toHaveAttribute('href', '/deliveries/8');
    const pickupRow = within(pickupLink.closest('tr') as HTMLElement);
    expect(pickupRow.getByText('Pickup')).toBeVisible();
    expect(pickupRow.getByText('Ready for collection')).toBeVisible();
    expect(pickupRow.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('sends the status of the In transit tab', async () => {
    const requests = respondWithDeliveries([buildDeliveryListItemFixture()]);
    customRenderAtRoute({ url: '/deliveries' });
    await screen.findByRole('link', { name: 'ZN7K-Q4M2-X9TD' });

    await userEvent.click(screen.getByRole('tab', { name: 'In transit' }));

    await waitFor(() => {
      expect(requests.some((params) => params.get('status') === 'in_transit')).toBe(true);
    });
  });

  it('filters by courier, searches, and clears both', async () => {
    const requests = respondWithDeliveries([buildDeliveryListItemFixture()]);
    const { router } = customRenderAtRoute({ url: '/deliveries' });
    await screen.findByRole('link', { name: 'ZN7K-Q4M2-X9TD' });
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();

    await userEvent.selectOptions(await screen.findByLabelText('Courier'), 'Old Courier');
    await waitFor(() => {
      expect(requests.some((params) => params.get('courier_id') === '2')).toBe(true);
    });

    await userEvent.type(screen.getByRole('textbox', { name: 'Search deliveries' }), 'KE88213');
    await waitFor(() => {
      expect(requests.some((params) => params.get('q') === 'KE88213')).toBe(true);
    });

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Search deliveries' })).toHaveValue('');
      expect(screen.getByLabelText('Courier')).toHaveValue('');
      expect(router.state.location.search).toBe('');
    });
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  });

  it('explains an empty search and an empty view', async () => {
    respondWithDeliveries([]);
    const { router } = customRenderAtRoute({ url: '/deliveries?q=zzz' });
    expect(
      await screen.findByText('No delivery matches that reference or tracking number.'),
    ).toBeVisible();

    await router.navigate('/deliveries');
    expect(await screen.findByText('No deliveries in this view.')).toBeVisible();
  });

  it('offers a retry when the list fails to load', async () => {
    respondWithDeliveries([]);
    server.use(http.get(mockEndpoints.deliveries, () => HttpResponse.json({}, { status: 500 })));
    customRenderAtRoute({ url: '/deliveries' });
    expect(await screen.findByText("Couldn't load deliveries. Try again.")).toBeVisible();
  });
});
