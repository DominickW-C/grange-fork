defmodule GrangeWeb.ChatChannel do
  @moduledoc """
  Shared town chat for every non-farm area: marketplace, casino, bank, and
  livestock market.

  There is deliberately one town room rather than one per area, so a player
  shopping at the seed stall and a player at the casino teller can talk. Farms
  are not part of it; they use the `chat` event on `GrangeWeb.FarmChannel`
  instead, which is scoped to the farm room.

  Messages are ephemeral and author-stamped by the server. Joining never
  replays history.
  """

  use Phoenix.Channel

  alias Grange.Chat

  @topic "chat:town"

  @impl true
  def join(@topic, _payload, socket) do
    case socket.assigns[:user] do
      %{username: _username} ->
        {:ok, %{room: "town"}, assign(socket, :chat_sent_at, [])}

      _ ->
        {:error, %{error: "not logged in"}}
    end
  end

  def join(_topic, _payload, _socket), do: {:error, %{error: "unknown room"}}

  @impl true
  def handle_in("chat", %{"text" => text}, socket) do
    user = socket.assigns[:user]
    now = System.monotonic_time(:millisecond)

    with %{username: username} <- user,
         {:ok, line} <- Chat.normalize(text),
         {:ok, sent_at} <- Chat.throttle(socket.assigns[:chat_sent_at] || [], now) do
      broadcast!(socket, "chat", Chat.line_payload(username, line))
      {:reply, :ok, assign(socket, :chat_sent_at, sent_at)}
    else
      {:error, :slow_down} -> {:reply, {:error, %{error: "slow down"}}, socket}
      {:error, reason} when is_binary(reason) -> {:reply, {:error, %{error: reason}}, socket}
      _ -> {:reply, {:error, %{error: "not logged in"}}, socket}
    end
  end

  def handle_in("chat", _payload, socket) do
    {:reply, {:error, %{error: "invalid message"}}, socket}
  end
end
