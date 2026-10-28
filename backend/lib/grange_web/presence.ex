defmodule GrangeWeb.Presence do
  @moduledoc """
  Tracks which players are standing in each shared hub area.

  Presence is ephemeral: it lives in memory and is cleaned up automatically
  when a socket or channel process exits. Farms never use it.
  """

  use Phoenix.Presence, otp_app: :grange, pubsub_server: Grange.PubSub
end
