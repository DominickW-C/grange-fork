defmodule GrangeWeb.FarmChannelChatTest do
  @moduledoc false
  use GrangeWeb.ChannelCase

  import Grange.FarmFixtures

  alias Grange.Accounts
  alias Grange.Chat
  alias GrangeWeb.ChannelCase, as: Helper
  alias GrangeWeb.FarmChannel

  setup do
    Accounts.reset()
    reset_farm_state()
    :ok
  end

  defp join_farm(username, owner) do
    user = Helper.register_user(username)

    socket(GrangeWeb.UserSocket, user.id, %{user: user})
    |> subscribe_and_join(FarmChannel, "farm:#{owner}")
  end

  test "farm chat reaches the room with the session author" do
    public_farm("Alice")
    {:ok, _reply, _alice} = join_farm("Alice", "Alice")
    {:ok, _reply, bob} = join_farm("Bob", "Alice")

    ref = push(bob, "chat", %{"text" => "  morning, Alice "})
    assert_reply(ref, :ok)

    assert_broadcast("chat", %{author: "Bob", text: "morning, Alice", at: at})
    assert is_integer(at)
  end

  test "empty farm messages are rejected" do
    public_farm("Alice")
    {:ok, _reply, alice} = join_farm("Alice", "Alice")

    ref = push(alice, "chat", %{"text" => ""})
    assert_reply(ref, :error, %{error: "message is empty"})
  end

  test "overlong farm messages are rejected" do
    public_farm("Alice")
    {:ok, _reply, alice} = join_farm("Alice", "Alice")

    ref = push(alice, "chat", %{"text" => String.duplicate("a", Chat.max_length() + 1)})
    assert_reply(ref, :error, %{error: "message is too long"})
  end

  test "farm chat is throttled" do
    public_farm("Alice")
    {:ok, _reply, alice} = join_farm("Alice", "Alice")

    refs = for _ <- 1..5, do: push(alice, "chat", %{"text" => "spam"})
    Enum.each(refs, &assert_reply(&1, :ok))

    ref = push(alice, "chat", %{"text" => "spam"})
    assert_reply(ref, :error, %{error: "slow down"})
  end

  test "a paused visitor's socket no longer pushes farm chat" do
    public_farm("Alice")
    {:ok, _reply, socket} = join_farm("Bob", "Alice")

    payload = %{author: "Alice", text: "behind you", at: 1}

    paused = Phoenix.Socket.assign(socket, :chat_active, false)
    assert {:noreply, _socket} = FarmChannel.handle_out("chat", payload, paused)
    refute_receive %Phoenix.Socket.Message{event: "chat"}, 100

    present = Phoenix.Socket.assign(socket, :chat_active, true)
    assert {:noreply, _socket} = FarmChannel.handle_out("chat", payload, present)
    assert_receive %Phoenix.Socket.Message{event: "chat", payload: ^payload}
  end

  test "other events still reach a paused visitor" do
    public_farm("Alice")
    {:ok, _reply, bob} = join_farm("Bob", "Alice")
    assert_reply(push(bob, "pausePresence", %{}), :ok)

    GrangeWeb.Endpoint.broadcast("farm:Alice", "farmUpdate", %{farm: %{owner: "Alice"}})
    assert_push("farmUpdate", %{farm: %{owner: "Alice"}})
  end
end
